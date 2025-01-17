import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
  // Redirect root to ontology page first
  if (request.nextUrl.pathname === '/') {
    const ontologyUrl = new URL('/ontology', request.url)
    return Response.redirect(ontologyUrl)
  }
})

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)', // Don't run middleware on static files
    '/', // Run middleware on index page
    '/(api|trpc)(.*)'], // Run middleware on API routes,
}