import { auth, clerkClient } from '@clerk/nextjs/server'

const DEFAULT_TOKEN_TEMPLATE = process.env.CLERK_BACKEND_TOKEN_TEMPLATE || 'session_token'

export async function getUserEmail(): Promise<string | null> {
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
  const { userId, getToken } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const token = await getToken({ template: DEFAULT_TOKEN_TEMPLATE })

  if (!token) {
    throw new Error(
      `Failed to obtain Clerk token with template "${DEFAULT_TOKEN_TEMPLATE}". Ensure the template exists and is assigned to the application.`
    )
  }

  return { userId, token }
}

export async function getBackendAuthHeaders(
  baseHeaders: HeadersInit = {}
): Promise<{ userId: string; headers: HeadersInit }> {
  const { userId, token } = await getBackendAuthContext()
  const headers = new Headers(baseHeaders)
  headers.set('user-id', userId)
  headers.set('Authorization', `Bearer ${token}`)
  return {
    userId,
    headers: Object.fromEntries(headers.entries())
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized'
}
