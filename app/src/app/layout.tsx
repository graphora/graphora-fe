import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { ThemeProvider } from '@/providers/theme-provider'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Graphora - Knowledge Graph Platform',
  description: 'Transform your unstructured data into powerful knowledge graphs with AI',
  icons: {
    icon: '/logo-light.png',
    shortcut: '/logo-light.png',
    apple: '/logo-light.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, 'min-h-screen')}>
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster />
            <SonnerToaster />
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}