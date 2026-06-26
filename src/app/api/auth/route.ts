import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  const secret = (process.env.AUTH_SECRET ?? "").trim();
  if (!password || password !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("site_auth", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return response;
}
