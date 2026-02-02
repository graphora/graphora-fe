import { auth, clerkClient } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

const DEFAULT_TOKEN_TEMPLATE = process.env.CLERK_BACKEND_TOKEN_TEMPLATE || 'session_token'

// Check if auth bypass is enabled for local development
const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'
const BYPASS_USER_ID = process.env.AUTH_BYPASS_USER_ID || 'local-dev-user'
const BYPASS_EMAIL = process.env.AUTH_BYPASS_EMAIL || 'dev@localhost'

function isTemplateMissingError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const candidate = error as { clerkError?: boolean; status?: number }
  return Boolean(candidate.clerkError && candidate.status === 404)
}

export async function getUserEmail(): Promise<string | null> {
  // Return bypass email in local dev mode
  if (isAuthBypassEnabled) {
    return BYPASS_EMAIL
  }

  try {
    const { userId } = await auth()
    if (!userId) {
      return null
    }

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const primaryEmail = user.primaryEmailAddressId
      ? user.emailAddresses.find(address => address.id === user.primaryEmailAddressId)?.emailAddress
      : undefined
    const fallbackEmail = user.emailAddresses[0]?.emailAddress

    const email = primaryEmail || fallbackEmail || null

    if (!email) {
      throw new Error(`No email address configured for user ${userId}`)
    }

    return email
  } catch (error) {
    console.error('Error getting user email:', error)
    throw error
  }
}

export async function getUserEmailOrThrow(): Promise<string> {
  const email = await getUserEmail()
  if (!email) {
    throw new Error('User email not found')
  }
  return email
}

export async function getBackendAuthContext(): Promise<{ userId: string; token: string }> {
  // Return bypass context in local dev mode
  if (isAuthBypassEnabled) {
    return {
      userId: BYPASS_USER_ID,
      token: 'bypass-token'
    }
  }

  const { userId, getToken } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const resolveToken = async (): Promise<string | null> => {
    try {
      return await getToken({ template: DEFAULT_TOKEN_TEMPLATE })
    } catch (error) {
      if (isTemplateMissingError(error)) {
        console.warn(
          `Clerk token template "${DEFAULT_TOKEN_TEMPLATE}" not found. Falling back to default session token.`
        )
        return null
      }
      throw error
    }
  }

  let token = await resolveToken()

  if (!token) {
    const cookieStore = await cookies()
    const sessionCookieToken = cookieStore.get('__session')?.value
    if (sessionCookieToken) {
      token = sessionCookieToken
    }
  }

  if (!token) {
    token = await getToken().catch(error => {
      console.error('Failed to obtain Clerk token without template:', error)
      throw error
    })
  }

  if (!token) {
    throw new Error(
      `Failed to obtain Clerk token. Provide a token template via CLERK_BACKEND_TOKEN_TEMPLATE or enable default session tokens.`
    )
  }

  return { userId, token }
}

export async function getBackendAuthHeaders(
  baseHeaders: HeadersInit = {}
): Promise<{ userId: string; headers: HeadersInit }> {
  const { userId, token } = await getBackendAuthContext()
  const headers = new Headers(baseHeaders)
  headers.set('Authorization', `Bearer ${token}`)
  return {
    userId,
    headers: Object.fromEntries(headers.entries())
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized'
}
