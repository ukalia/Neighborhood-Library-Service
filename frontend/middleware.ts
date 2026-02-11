import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login"];
const ROLE_ROUTES = {
  MEMBER: "/member",
  LIBRARIAN: "/librarian",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("auth_token")?.value;
  const role = request.cookies.get("auth_role")?.value as "MEMBER" | "LIBRARIAN" | undefined;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    if (token && role) {
      const homeRoute = ROLE_ROUTES[role];
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
    return NextResponse.next();
  }

  if (!token || !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/member") && role !== "MEMBER") {
    return NextResponse.redirect(new URL(ROLE_ROUTES[role], request.url));
  }

  if (pathname.startsWith("/librarian") && role !== "LIBRARIAN") {
    return NextResponse.redirect(new URL(ROLE_ROUTES[role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};
