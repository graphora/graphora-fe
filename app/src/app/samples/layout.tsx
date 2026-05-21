'use client'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { Logo } from '@/components/ui/logo'
import { useAuth } from '@/hooks/useAuth'

/**
 * Adaptive layout for /samples — the gallery is unauthenticated
 * (per Clerk middleware allowlist) but signed-in operators
 * shouldn't lose the sidebar / topbar when they land here, and
 * shouldn't see "Sign in / Sign up" CTAs.
 *
 * Branches on auth state:
 *   * signed-in → wrap in DashboardLayout — same sidebar + topbar
 *     experience as every other /(app)/ page. Operators can
 *     navigate back to /dashboard without hitting the logo.
 *   * signed-out → simple promo top bar with Sign in / Sign up
 *     CTAs. Stripped-down chrome for unauth visitors who haven't
 *     committed to the product yet.
 *
 * Reviewer-flagged on 0028f11: pre-fix this layout was always the
 * promo top bar — signed-in operators landed on /samples and
 * lost the sidebar + saw "Sign in / Sign up" buttons despite
 * being already authenticated.
 */
export default function SamplesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, isSignedIn } = useAuth()

  // ``isLoaded`` is the "did we get a definitive answer from
  // the auth provider yet?" signal. Until it flips true,
  // render the promo layout — if we guessed signed-in and were
  // wrong, the brief sidebar → no-sidebar flash would be
  // jarring; the opposite (promo → sidebar) is less disruptive
  // because the sidebar appears as an addition.
  if (isLoaded && isSignedIn) {
    return <DashboardLayout>{children}</DashboardLayout>
  }

  return <PromoLayout>{children}</PromoLayout>
}

/**
 * Stripped-down top-bar chrome for unauthenticated visitors —
 * logo on the left, Sign in / Sign up CTAs on the right.
 */
function PromoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex h-14 items-center justify-between border-b px-6"
        style={{ borderColor: 'var(--line)' }}
      >
        <Link href="/samples" className="flex items-center gap-2">
          <Logo width={24} height={24} />
          <span className="font-medium tracking-tight">Graphora</span>
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
