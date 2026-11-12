
export const GH_API = "https://api.github.com";

export class GitHubApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.details = details;
  }
}

export async function githubFetch<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!token) {
    throw new GitHubApiError("GitHub access token is missing.", 401);
  }

  const response = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  const raw = await response.text();

  let data: any = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw || "GitHub returned an invalid response." };
  }

  if (!response.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : `GitHub API error (${response.status})`;

    throw new GitHubApiError(message, response.status, data);
  }

  return data as T;
}
