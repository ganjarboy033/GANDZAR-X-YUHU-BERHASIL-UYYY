import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
export async function GET() {
  const s = await getSession();
  if (!s.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ login: s.login, avatarUrl: s.avatarUrl, name: s.name });
}
