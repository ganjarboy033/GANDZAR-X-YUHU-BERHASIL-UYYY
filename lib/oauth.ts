export const STATE_COOKIE = "xiyu_oauth_state";

/**
 * URL dasar aplikasi diambil dari request yang sedang berjalan, jadi selalu sama dengan domain
 * yang dibuka pengguna (cookie state & sesi harus berada di domain yang sama dengan callback).
 * Isi APP_URL hanya jika perlu memaksa domain tertentu.
 */
export function appBase(req: Request): string {
  const forced = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (forced) return forced;
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});
