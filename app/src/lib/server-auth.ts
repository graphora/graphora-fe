/**
 * Server-side authentication utilities that handle both Clerk and bypass modes.
 * Use these functions instead of importing auth() directly from @clerk/nextjs/server.
 */

// Check if auth bypass is enabled for local development
const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'
const BYPASS_USER_ID = process.env.NEXT_PUBLIC_AUTH_BYPASS_USER_ID || 'local-dev-user'

interface AuthResult {
  userId: string | null
  getToken?: (options?: { template?: string }) => Promise<string | null>
}

/**
 * Get authentication context for server-side code.
 * Handles both Clerk authentication and bypass mode.
 */
export async function getServerAuth(): Promise<AuthResult> {
  // In bypass mode, return mock auth data without calling Clerk
  if (isAuthBypassEnabled) {
    return {
      userId: BYPASS_USER_ID,
      getToken: async () => 'bypass-token'
    }
  }

  // In normal mode, use Clerk's auth
  const { auth } = await import('@clerk/nextjs/server')
  return auth()
}

/**
 * Get the current user ID from server-side code.
 * Returns null if not authenticated (unless in bypass mode).
 */
export async function getServerUserId(): Promise<string | null> {
  const { userId } = await getServerAuth()
  return userId
}

/**
 * Require authentication and return user ID.
 * Throws 'Unauthorized' error if not authenticated.
 */
export async function requireServerAuth(): Promise<string> {
  const { userId } = await getServerAuth()
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}
