import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { STATE_COOKIE, appBase, cookieOpts } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const base = appBase(req);
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", base));
  }
  const state = randomBytes(24).toString("hex");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", `${base}/api/auth/github/callback`);
  url.searchParams.set("scope", "repo read:user user:email");
  url.searchParams.set("state", state);
  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, cookieOpts(600));
  return response;
}
