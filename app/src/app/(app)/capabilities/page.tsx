import { CapabilitiesPage } from './capabilities-page'

/**
 * Server-component entry for /capabilities. Mirrors the bench
 * page's split — client component carries all interactive
 * state; this file is just the Next.js route binding.
 */
export default function Page() {
  return <CapabilitiesPage />
}
