import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { githubFetch } from "@/lib/github";
export async function GET() {
  const s = await getSession();
  if (!s.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const repos = await githubFetch<any[]>(s.accessToken, "/user/repos?sort=updated&per_page=100&affiliation=owner");
    return NextResponse.json(repos.map(r => ({ id: r.id, fullName: r.full_name, name: r.name, private: r.private, defaultBranch: r.default_branch, htmlUrl: r.html_url })));
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load repositories" }, { status: 502 }); }
}
