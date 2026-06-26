import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const auth = request.cookies.get("site_auth")?.value;
  const secret = (process.env.AUTH_SECRET ?? "").trim();
  if (!auth || auth !== secret) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
