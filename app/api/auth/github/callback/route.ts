import { NextRequest, NextResponse } from "next/server";
import { SessionConfigError, getSession } from "@/lib/session";
import { STATE_COOKIE, appBase, cookieOpts } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = appBase(req);
  const fail = (reason: string, detail?: string) => {
    const target = new URL("/login", base);
    target.searchParams.set("error", reason);
    if (detail) target.searchParams.set("detail", detail.slice(0, 160));
    console.error("[xiyu-oauth]", reason, detail || "");
    const res = NextResponse.redirect(target);
    res.cookies.set(STATE_COOKIE, "", cookieOpts(0));
    return res;
  };

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("access_denied", params.get("error_description") || undefined);

  const code = params.get("code");
  const state = params.get("state");
  const saved = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !saved || state !== saved) return fail("invalid_oauth_state");

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("oauth_not_configured");

  let tokenData: any;
  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${base}/api/auth/github/callback`,
      }),
      cache: "no-store",
    });
    tokenData = await tokenResponse.json();
  } catch {
    return fail("oauth_exchange_failed", "Tidak bisa menghubungi GitHub.");
  }
  if (!tokenData?.access_token) {
    return fail("oauth_exchange_failed", tokenData?.error_description || tokenData?.error);
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!userResponse.ok) return fail("github_profile_failed", `HTTP ${userResponse.status}`);
  const user = await userResponse.json();

  try {
    const session = await getSession();
    session.accessToken = tokenData.access_token;
    session.login = user.login;
    session.avatarUrl = user.avatar_url;
    session.name = user.name;
    await session.save();
  } catch (e) {
    if (e instanceof SessionConfigError) return fail("session_config");
    return fail("session_save_failed", e instanceof Error ? e.message : undefined);
  }

  const response = NextResponse.redirect(new URL("/dashboard", base));
  response.cookies.set(STATE_COOKIE, "", cookieOpts(0));
  return response;
}
