import { NextResponse, type NextRequest } from "next/server";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/app/lib/auth-cookies";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/api/auth", "/api/forgot-password"];

const ROLE_PATHS: Record<string, string[]> = {
  super_admin: ["/admin"],
  center_owner: ["/center"],
  course_owner: ["/course"],
  teacher: ["/teacher"],
  student: ["/student"],
};

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
  // Public landing pages for individual centers and courses
  if (/^\/(center|course)\/[^\/]+$/.test(pathname)) return true;
  return false;
}

function getRoleFromClaims(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    ) as Record<string, unknown>;
    return (decoded.role as string) ?? null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role =
    getRoleFromClaims(sessionCookie) ??
    request.cookies.get(ROLE_COOKIE)?.value ??
    null;

  if (pathname === "/") {
    const dashboardMap: Record<string, string> = {
      super_admin: "/admin",
      center_owner: "/center",
      course_owner: "/course",
      teacher: "/teacher",
      student: "/student",
    };
    const dest = role ? dashboardMap[role] ?? "/login" : "/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (role) {
    const allowedPrefixes = ROLE_PATHS[role] ?? [];
    const isAllowed = allowedPrefixes.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      const dashboardMap: Record<string, string> = {
        super_admin: "/admin",
        center_owner: "/center",
        course_owner: "/course",
        teacher: "/teacher",
        student: "/student",
      };
      return NextResponse.redirect(
        new URL(dashboardMap[role] ?? "/login", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
