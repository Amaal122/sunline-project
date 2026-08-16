import { NextRequest, NextResponse } from "next/server";

/**
 * Second, independent layer of protection for /admin — on top of the
 * is_admin check already enforced in the React layout AND on top of
 * the backend's get_current_admin_user dependency on every admin API
 * call. This one runs at the edge, before any page or JS loads, so an
 * unauthenticated visitor can't even see that an admin panel exists.
 *
 * Requires ADMIN_BASIC_AUTH_USER and ADMIN_BASIC_AUTH_PASS to be set
 * as environment variables (server-side only — no NEXT_PUBLIC_ prefix).
 */
export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const expectedUser = process.env.ADMIN_BASIC_AUTH_USER;
  const expectedPass = process.env.ADMIN_BASIC_AUTH_PASS;

  // Fail closed: if the env vars aren't set, block access rather than
  // silently letting everyone through — a misconfigured deployment
  // should never mean "no protection at all."
  if (!expectedUser || !expectedPass) {
    return new NextResponse("Admin access is not configured.", { status: 503 });
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.split(" ")[1], "base64").toString();
    const [user, pass] = decoded.split(":");
    if (user === expectedUser && pass === expectedPass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SUNLINE Admin"' },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
