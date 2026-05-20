import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Sample gallery is unauthenticated by design — visitors see
  // pre-extracted graphs from the golden corpus BEFORE deciding
  // whether to sign up. Matches the same posture as
  // ``/api/v1/samples`` on the backend.
  '/samples(.*)',
  '/api(.*)', // Add this line to include API routes
  '/trpc(.*)' // Add this line to include TRPC routes
])

// Check if auth bypass is enabled for local development
const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'

// Bypass middleware that allows all requests through
function bypassMiddleware(request: NextRequest) {
  return NextResponse.next()
}

// Use bypass middleware when AUTH_BYPASS is enabled, otherwise use Clerk
export default isAuthBypassEnabled
  ? bypassMiddleware
  : clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect()
      }
    })

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)']
}