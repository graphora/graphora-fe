import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { ThemeProvider } from '@/providers/theme-provider'
import { NetworkStatus } from '@/components/ui/network-status'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Graphora - Knowledge Graph Platform',
  description: 'Transform your unstructured data into powerful knowledge graphs with AI',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/logo-light.png',
    apple: '/logo-light.png',
  },
}

// Check if auth bypass is enabled for local development
const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Toaster />
      <SonnerToaster />
      <NetworkStatus />
      {children}
    </ThemeProvider>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen font-sans')}>
        {isAuthBypassEnabled ? (
          <AppContent>{children}</AppContent>
        ) : (
          <ClerkProvider>
            <AppContent>{children}</AppContent>
          </ClerkProvider>
        )}
      </body>
    </html>
  )
}
