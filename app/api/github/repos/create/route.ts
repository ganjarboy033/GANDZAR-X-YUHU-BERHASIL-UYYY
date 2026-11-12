
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

    const name = formatRepositoryName(body.name);
    const description = String(body.description || "").trim();
    const isPrivate = body.private === true;

    if (!/^[A-Za-z0-9._-]{1,100}$/.test(name)) {
      return NextResponse.json(
        {
          error:
            "Repository name is invalid. Use letters, numbers, spaces, dots, underscores, or hyphens.",
        },
        { status: 400 }
      );
    }

    const repo = await githubFetch<{
      id: number;
      name: string;
      full_name: string;
      html_url: string;
      default_branch: string | null;
      private: boolean;
    }>(
      session.accessToken,
      "/user/repos",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description.slice(0, 350),
          private: isPrivate,
          auto_init: true,
        }),
      }
    );

    return NextResponse.json({
      success: true,
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch || "main",
      private: repo.private,
    });
  } catch (error) {
    console.error("Repository creation failed:", error);

    if (error instanceof GitHubApiError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          githubStatus: error.status,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not create repository.",
      },
      { status: 500 }
    );
  }
}
