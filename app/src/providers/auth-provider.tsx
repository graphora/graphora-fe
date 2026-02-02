'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { createContext, useContext, ReactNode } from 'react'

// Check if auth bypass is enabled for local development
const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'
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

// Mock auth context for bypass mode
interface MockAuthContextType {
  isLoaded: boolean
  isSignedIn: boolean
  userId: string | null
  user: typeof mockUser | null
  signOut: () => Promise<void>
}

const MockAuthContext = createContext<MockAuthContextType>({
  isLoaded: true,
  isSignedIn: true,
  userId: BYPASS_USER_ID,
  user: mockUser,
  signOut: async () => {},
})

// Hook to use mock auth (mirrors Clerk's useUser and useAuth)
export function useMockAuth() {
  return useContext(MockAuthContext)
}

// Mock provider for bypass mode
function MockClerkProvider({ children }: { children: ReactNode }) {
  const value: MockAuthContextType = {
    isLoaded: true,
    isSignedIn: true,
    userId: BYPASS_USER_ID,
    user: mockUser,
    signOut: async () => {
      console.log('Sign out called in bypass mode (no-op)')
    },
  }

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  )
}

// Unified auth provider that uses real Clerk or mock based on environment
export function AuthProvider({ children }: { children: ReactNode }) {
  if (isAuthBypassEnabled) {
    return <MockClerkProvider>{children}</MockClerkProvider>
  }

  return <ClerkProvider>{children}</ClerkProvider>
}

// Export bypass status for use in components
export { isAuthBypassEnabled }
