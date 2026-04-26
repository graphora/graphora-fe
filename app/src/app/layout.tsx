import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { ThemeProvider } from '@/providers/theme-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { NetworkStatus } from '@/components/ui/network-status'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Graphora — Knowledge Graph Platform',
  description: 'Turn unstructured documents into queryable knowledge graphs.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/logo-light.png',
    apple: '/logo-light.png',
  },
}

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
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
    <html lang="en" suppressHydrationWarning className={cn(plexSans.variable, plexMono.variable)}>
      <body className={cn('min-h-screen font-sans antialiased')}>
        <AuthProvider>
          <AppContent>{children}</AppContent>
        </AuthProvider>
      </body>
    </html>
  )
}
