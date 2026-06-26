import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const auth = request.cookies.get("site_auth")?.value;
  if (auth !== process.env.AUTH_SECRET) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
