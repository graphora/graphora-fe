import Link from 'next/link'

import { Logo } from '@/components/ui/logo'

/**
 * Standalone layout for the public sample gallery.
 *
 * Lives OUTSIDE the ``(app)/`` route group on purpose — that
 * group's layout wraps everything in the authed-sidebar shell,
 * which is wrong for unauth visitors who haven't signed in
 * yet. Visitors hitting /samples should see a clean, simple
 * top bar with the logo + "Sign in" CTA, nothing else.
 *
 * Inherits ThemeProvider + AuthProvider + fonts from the root
 * src/app/layout.tsx.
 */
export default function SamplesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex h-14 items-center justify-between border-b px-6"
        style={{ borderColor: 'var(--line)' }}
      >
        <Link href="/samples" className="flex items-center gap-2">
          <Logo size={24} />
          <span className="font-semibold tracking-tight">Graphora</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            · Sample gallery
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/sign-in"
            className="text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-foreground px-3 py-1.5 text-background font-medium hover:opacity-90"
          >
            Sign up
          </Link>
        </nav>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
