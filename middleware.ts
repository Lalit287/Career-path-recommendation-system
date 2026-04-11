import { NextRequest, NextResponse } from "next/server"

// Routes that don't require authentication
const publicRoutes = ["/", "/login", "/signup"]

// API routes that are public
const publicApiRoutes = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/careers",
  "/api/health/ai",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if route is public
  const isPublicRoute = publicRoutes.includes(pathname)
  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  )
  
  // Allow public routes and API routes to pass through
  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next()
  }

  // Check for authentication token
  const authToken = request.cookies.get("auth-token")?.value

  // If no token and trying to access protected route, redirect to login
  if (!authToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Allow authenticated users to proceed
  return NextResponse.next()
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
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
