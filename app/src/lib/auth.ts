import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export interface AuthUser {
  id: string
  name: string
  email: string
  token: string
}

/**
 * Get the authenticated user from the request
 * @param request The Next.js request object
 * @returns The authenticated user or null if not authenticated
 */
export async function getAuth(request: NextRequest): Promise<AuthUser | null> {
  // For now, we'll use a simple cookie-based auth
  // In a real app, you would validate the token with your auth service
  const cookieStore = await cookies()
  const authTokenObj = await cookieStore.get('auth_token')
  const authToken = authTokenObj?.value
  
  // if (!authToken) {
  //   return null
  // }
  
  // Mock user for development
  // In production, you would decode the token or validate it with your auth service
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    token: authToken || ''
  }
}

/**
 * Check if the user is authenticated
 * @param request The Next.js request object
 * @returns True if the user is authenticated, false otherwise
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const auth = await getAuth(request)
  return auth !== null
} 