import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Demo mode: No authentication checks required
  // Allow access to all routes without auth verification
  return NextResponse.next({
    request,
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
