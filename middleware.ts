import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieValue } from "@/lib/adminAuth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const secret = process.env.ADMIN_PASSWORD;
    const expected = secret ? await getAdminCookieValue(secret) : "";
    const isAdmin = Boolean(expected) && request.cookies.get("bb_admin")?.value === expected;
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
