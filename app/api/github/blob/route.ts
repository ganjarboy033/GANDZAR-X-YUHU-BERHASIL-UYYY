
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { githubFetch, GitHubApiError } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_BYTES / 3) * 4;

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
    const path = String(body.path || "").replaceAll("\\", "/");
    const contentBase64 = String(body.contentBase64 || "").trim();

    if (
      !/^[A-Za-z0-9-]+$/.test(owner) ||
      !/^[A-Za-z0-9._-]{1,100}$/.test(repo)
    ) {
      return NextResponse.json(
        { error: "Invalid repository owner or name." },
        { status: 400 }
      );
    }

    if (
      !path ||
      path.startsWith("/") ||
      path.includes("\0") ||
      path.split("/").some(
        (part: string) => !part || part === "." || part === ".."
      )
    ) {
      return NextResponse.json(
        { error: "Invalid file path." },
        { status: 400 }
      );
    }

    if (!contentBase64) {
      return NextResponse.json(
        { error: "File content is empty." },
        { status: 400 }
      );
    }

    if (
      contentBase64.length > MAX_BASE64_LENGTH ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        contentBase64
      )
    ) {
      return NextResponse.json(
        {
          error:
            "File is too large or its Base64 content is invalid. Current per-file limit is 3 MB.",
        },
        { status: 413 }
      );
    }

    const estimatedBytes =
      Math.floor((contentBase64.length * 3) / 4) -
      (contentBase64.endsWith("==")
        ? 2
        : contentBase64.endsWith("=")
          ? 1
          : 0);

    if (estimatedBytes > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 3 MB per-file limit." },
        { status: 413 }
      );
    }

    const result = await githubFetch<{ sha: string }>(
      session.accessToken,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content: contentBase64,
          encoding: "base64",
        }),
      }
    );

    return NextResponse.json({
      success: true,
      path,
      sha: result.sha,
    });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      console.error("GitHub Blob API error:", {
        status: error.status,
        message: error.message,
      });

      return NextResponse.json(
        {
          error: error.message,
          githubStatus: error.status,
        },
        { status: error.status }
      );
    }

    console.error("GitHub Blob route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error while uploading file.",
      },
      { status: 500 }
    );
  }
}
