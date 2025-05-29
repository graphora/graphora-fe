import { auth } from '@clerk/nextjs/server'

export async function getUserEmail(): Promise<string | null> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return null
    }

    // Check if CLERK_SECRET_KEY is available
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('CLERK_SECRET_KEY environment variable is not set')
      throw new Error('Server configuration error: CLERK_SECRET_KEY not configured')
    }

    // Get user email from Clerk
    const userResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!userResponse.ok) {
      console.error('Failed to get user info from Clerk:', userResponse.status, userResponse.statusText)
      const errorText = await userResponse.text()
      console.error('Clerk API error response:', errorText)
      throw new Error(`Failed to get user info from Clerk: ${userResponse.status}`)
    }

    const userData = await userResponse.json()
    const userEmail = userData.email_addresses?.[0]?.email_address

    if (!userEmail) {
      console.error('No email address found for user:', userId)
      throw new Error('No email address found for user')
    }

    return userEmail
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