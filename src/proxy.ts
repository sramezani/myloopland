import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends signed-out visitors from the dashboard to /signin, and signed-in ones from the
 * landing and sign-in pages to the dashboard, before anything renders. Only an optimistic
 * cookie check: every page still runs requireUser().
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname, search } = request.nextUrl;
  if (pathname === "/" || pathname === "/signin") {
    // Any query means the visitor was sent here on purpose: Claude's connect flow
    // (?client_id=…), or ?expired with a stale cookie. Show the page, or it would loop.
    if (hasSession && !search) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }
  if (!hasSession) return NextResponse.redirect(new URL("/signin", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/signin", "/dashboard/:path*"],
};
