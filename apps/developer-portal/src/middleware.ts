import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/register', '/forgot-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // For static assets and API routes, skip middleware
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Client-side auth check is handled by the AuthProvider
  // This middleware just ensures proper routing structure
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
