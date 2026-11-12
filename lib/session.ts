import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type UserSession = {
  accessToken?: string;
  login?: string;
  avatarUrl?: string;
  name?: string | null;
};

export class SessionConfigError extends Error {
  constructor() {
    super("SESSION_PASSWORD belum diisi atau kurang dari 32 karakter.");
    this.name = "SessionConfigError";
  }
}

export function sessionConfigured() {
  const p = process.env.SESSION_PASSWORD;
  return !!p && p.length >= 32;
}

const baseOptions: Omit<SessionOptions, "password"> = {
  cookieName: "xiyu_github_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession(): Promise<IronSession<UserSession>> {
  if (!sessionConfigured()) {
    if (process.env.NODE_ENV === "production") {
      // Jangan pernah memakai password bawaan di production: cookie sesi bisa dipalsukan.
      // Halaman tetap bisa dibuka (sebagai belum login), tapi login akan gagal dengan pesan jelas.
      return {
        save: async () => {
          throw new SessionConfigError();
        },
        destroy: () => {},
        updateConfig: () => {},
      } as unknown as IronSession<UserSession>;
    }
    return getIronSession<UserSession>(await cookies(), {
      ...baseOptions,
      password: "dev-only-session-password-not-for-production-use",
    });
  }
  return getIronSession<UserSession>(await cookies(), {
    ...baseOptions,
    password: process.env.SESSION_PASSWORD as string,
  });
}
