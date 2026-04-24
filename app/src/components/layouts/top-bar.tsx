'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export type Crumb = {
  label: string
  href?: string
}

type TopBarProps = {
  crumbs?: Crumb[]
  actions?: React.ReactNode
  className?: string
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  ontology: 'Workflow',
  ontologies: 'Ontologies',
  transform: 'Transform',
  merge: 'Merge',
  'schema-chat': 'Schema chat',
  usage: 'Usage',
  config: 'Configuration',
  domain: 'Domain',
  'domain-apps': 'Domain apps',
  'sign-in': 'Sign in',
  'sign-up': 'Sign up',
}

function humanize(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )
}

function deriveCrumbs(pathname: string): Crumb[] {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) {
    return [{ label: 'Graphora' }, { label: 'Home' }]
  }
  const crumbs: Crumb[] = [{ label: 'Graphora', href: '/dashboard' }]
  let acc = ''
  parts.forEach((part, idx) => {
    acc += `/${part}`
    const isLast = idx === parts.length - 1
    crumbs.push(isLast ? { label: humanize(part) } : { label: humanize(part), href: acc })
  })
  return crumbs
}

/**
 * Topbar — the thin 52px row above page content. Holds breadcrumbs on the left
 * and a slot for per-page actions on the right. Horizontal padding matches
 * `.content-inner` (32px) so the breadcrumb lines up with the page title
 * below — a fix from the iteration history.
 */
export function TopBar({ crumbs, actions, className }: TopBarProps) {
  const pathname = usePathname() || '/'
  const resolved = crumbs && crumbs.length > 0 ? crumbs : deriveCrumbs(pathname)

  return (
    <div
      className={cn(
        'relative z-[1] flex items-center gap-4',
        'h-[52px] shrink-0',
        className,
      )}
      style={{
        padding: '0 32px',
        borderBottom: '1px solid var(--line)',
        background: 'rgb(var(--background))',
      }}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[12.5px]">
        {resolved.map((crumb, idx) => {
          const isLast = idx === resolved.length - 1
          return (
            <React.Fragment key={`${crumb.label}-${idx}`}>
              {idx > 0 && (
                <span aria-hidden style={{ color: 'var(--fg-faint)' }}>
                  /
                </span>
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="truncate transition-colors"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="truncate"
                  style={{ color: isLast ? 'var(--fg)' : 'var(--fg-muted)' }}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          )
        })}
      </nav>

      {actions && (
        <div className="ml-auto flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
