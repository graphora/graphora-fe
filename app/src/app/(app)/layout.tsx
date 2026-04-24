import type { Metadata } from 'next'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'

export const metadata: Metadata = {
  title: 'Graphora',
}

/**
 * (app) route-group layout — the persistent dashboard shell.
 *
 * Next.js App Router keeps this layout instance mounted across child
 * navigations, so the sidebar, topbar, and ambient-graph backdrop no
 * longer re-initialize on every route change. That eliminates the
 * perceived "sidebar is slow" jank: clicking a nav item now only swaps
 * the `children` subtree, not the entire chrome.
 *
 * Pages under `(app)/` render their content directly — they must NOT
 * wrap their own <DashboardLayout>. The TopBar derives breadcrumbs from
 * the current pathname automatically.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
