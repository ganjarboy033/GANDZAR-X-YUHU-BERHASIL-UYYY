
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { githubFetch, GitHubApiError } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatRepositoryName(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, "-");
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Please login with GitHub again." },
        { status: 401 }
      );
    }

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const owner = String(body.owner || "").trim();
    const repo = formatRepositoryName(body.repo);
    const branch = String(body.branch || "main").trim();
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const message = String(
      body.message || "Upload project with XIYU GITHUB UPLOADER"
    ).slice(0, 200);

    if (
      !/^[A-Za-z0-9-]+$/.test(owner) ||
      !/^[A-Za-z0-9._-]{1,100}$/.test(repo) ||
      !/^[A-Za-z0-9._/-]{1,200}$/.test(branch) ||
      !entries.length ||
      entries.length > 1500
    ) {
      return NextResponse.json(
        { error: "Invalid commit data. Maximum 1,500 files." },
        { status: 400 }
      );
    }

    if (
      entries.some(
        (entry: any) =>
          typeof entry.path !== "string" ||
          typeof entry.sha !== "string" ||
          !entry.path ||
          entry.path.startsWith("/") ||
          entry.path.split("/").some(
            (part: string) => part === "." || part === ".."
          )
      )
    ) {
      return NextResponse.json(
        { error: "Invalid file entries." },
        { status: 400 }
      );
    }

    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const encodedBranch = encodeURIComponent(branch).replaceAll(
      "%2F",
      "/"
    );

    const refPath =
      `/repos/${encodedOwner}/${encodedRepo}/git/ref/heads/${encodedBranch}`;

    const refResponse = await fetch(
      `https://api.github.com${refPath}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );

    let parent: string | undefined;
    let baseTree: string | undefined;

    if (refResponse.ok) {
      const ref: any = await refResponse.json();

      const parentSha = String(ref?.object?.sha || "");

      if (!parentSha) {
        return NextResponse.json(
          { error: "GitHub branch reference has no commit SHA." },
          { status: 502 }
        );
      }

      parent = parentSha;

      const parentCommit = await githubFetch<any>(
        session.accessToken,
        `/repos/${encodedOwner}/${encodedRepo}/git/commits/${encodeURIComponent(parentSha)}`
      );

      baseTree = parentCommit.tree.sha;
    } else if (refResponse.status !== 404) {
      const problem = await refResponse.json().catch(() => ({}));

      throw new Error(
        problem.message || `Could not read branch (${refResponse.status})`
      );
    }

    const treePayload: any = {
      tree: entries.map((entry: any) => ({
        path: entry.path,
        mode: "100644",
        type: "blob",
        sha: entry.sha,
      })),
    };

    if (baseTree) {
      treePayload.base_tree = baseTree;
    }

    const tree = await githubFetch<any>(
      session.accessToken,
      `/repos/${encodedOwner}/${encodedRepo}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify(treePayload),
      }
    );

    const commitPayload: any = {
      message,
      tree: tree.sha,
    };

    if (parent) {
      commitPayload.parents = [parent];
    }

    const commit = await githubFetch<any>(
      session.accessToken,
      `/repos/${encodedOwner}/${encodedRepo}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify(commitPayload),
      }
    );

    if (parent) {
      await githubFetch<any>(
        session.accessToken,
        `/repos/${encodedOwner}/${encodedRepo}/git/refs/heads/${encodedBranch}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            sha: commit.sha,
          }),
        }
      );
    } else {
      await githubFetch<any>(
        session.accessToken,
        `/repos/${encodedOwner}/${encodedRepo}/git/refs`,
        {
          method: "POST",
          body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: commit.sha,
          }),
        }
      );
    }

    const repoUrl = `https://github.com/${owner}/${repo}`;

    return NextResponse.json({
      success: true,
      commitSha: commit.sha,
      htmlUrl: `${repoUrl}/commit/${commit.sha}`,
      repoUrl,
      fullName: `${owner}/${repo}`,
      fileCount: entries.length,
    });
  } catch (error) {
    console.error("GitHub commit error:", error);

    if (error instanceof GitHubApiError) {
      return NextResponse.json(
        {
          error: error.message,
          githubStatus: error.status,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Commit failed. Ensure the branch exists and repository is ready.",
      },
      { status: 502 }
    );
  }
}
