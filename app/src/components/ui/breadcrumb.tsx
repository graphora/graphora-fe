import * as React from 'react'
import { cn } from '@/lib/utils'

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {
  children: React.ReactNode
  isCurrentPage?: boolean
}

interface BreadcrumbLinkProps extends React.HTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode
}

export function Breadcrumb({ className, children, ...props }: BreadcrumbProps) {
  return (
    <nav className={cn('flex', className)} aria-label="Breadcrumb" {...props}>
      <ol className="flex items-center space-x-2">{children}</ol>
    </nav>
  )
}

export function BreadcrumbItem({ className, isCurrentPage, children, ...props }: BreadcrumbItemProps) {
  return (
    <li
      className={cn('flex items-center text-sm', className)}
      aria-current={isCurrentPage ? 'page' : undefined}
      {...props}
    >
      {children}
    </li>
  )
}

export function BreadcrumbLink({ className, children, ...props }: BreadcrumbLinkProps) {
  return (
    <a
      className={cn(
        'text-gray-600 hover:text-gray-900 transition-colors cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
} 