'use client'

import { SignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    // In bypass mode, redirect to dashboard since user is "already authenticated"
    if (isAuthBypassEnabled) {
      router.replace('/dashboard')
    }
  }, [router])

  // In bypass mode, show loading while redirecting
  if (isAuthBypassEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </main>
    )
  }

  return <SignUp />
}