import { BenchPage } from './bench-page'

/**
 * Server-component entry for /bench. The client component
 * carries all interactive state; this file is just the Next.js
 * route binding. No params, no async data — the bench fetch
 * fires from the client so the page can show a skeleton on
 * navigation instead of blocking the navigation transition.
 */
export default function Page() {
  return <BenchPage />
}
