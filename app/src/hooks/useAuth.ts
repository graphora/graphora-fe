'use client'

import { useUser as useClerkUser, useAuth as useClerkAuth } from '@clerk/nextjs'
import { useMockAuth, isAuthBypassEnabled } from '@/providers/auth-provider'

// Check if auth bypass is enabled
const BYPASS_USER_ID = process.env.NEXT_PUBLIC_AUTH_BYPASS_USER_ID || 'local-dev-user'
const BYPASS_EMAIL = process.env.NEXT_PUBLIC_AUTH_BYPASS_EMAIL || 'dev@localhost'

// Mock user object for bypass mode
const mockUser = {
  id: BYPASS_USER_ID,
  primaryEmailAddress: {
    emailAddress: BYPASS_EMAIL,
  },
  emailAddresses: [{ emailAddress: BYPASS_EMAIL }],
  firstName: 'Local',
  lastName: 'Developer',
  fullName: 'Local Developer',
  imageUrl: '',
  username: 'local-dev',
}

/**
 * Hook that provides user data, working in both Clerk and bypass modes.
 * Use this instead of Clerk's useUser directly.
 */
export function useUser() {
  // In bypass mode, return mock data without calling Clerk hooks
  if (isAuthBypassEnabled) {
    return {
      isLoaded: true,
      isSignedIn: true,
      user: mockUser,
    }
  }

  // In normal mode, use Clerk's hook
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkUser()
}

/**
 * Hook that provides auth state, working in both Clerk and bypass modes.
 * Use this instead of Clerk's useAuth directly.
 */
export function useAuth() {
  // In bypass mode, return mock data without calling Clerk hooks
  if (isAuthBypassEnabled) {
    return {
      isLoaded: true,
      isSignedIn: true,
      userId: BYPASS_USER_ID,
      sessionId: 'local-dev-session',
      getToken: async () => 'bypass-token',
      signOut: async () => {
        console.log('Sign out called in bypass mode (no-op)')
      },
    }
  }

  // In normal mode, use Clerk's hook
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkAuth()
}

/**
 * Get the current user's email address.
 */
export function useUserEmail(): string | null {
  const { user, isLoaded } = useUser()

  if (!isLoaded || !user) {
    return null
  }

  if (isAuthBypassEnabled) {
    return BYPASS_EMAIL
  }

  // Type assertion for Clerk user object
  const clerkUser = user as { primaryEmailAddress?: { emailAddress: string } }
  return clerkUser.primaryEmailAddress?.emailAddress || null
}

/**
 * Check if the user is authenticated.
 */
export function useIsAuthenticated(): boolean {
  const { isLoaded, isSignedIn } = useAuth()
  return isLoaded && !!isSignedIn
}

// Re-export bypass status
export { isAuthBypassEnabled }
