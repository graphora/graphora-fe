"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * IconBadge — flat, token-driven square chip for surfacing an
 * icon next to a label (sidebar items, list rows, stat tiles).
 *
 * Design audit cleanup: the previous implementation used
 * ``bg-gradient-to-br from-X via-Y to-Z`` multi-color rainbow
 * fills on ``rounded-xl/2xl/3xl`` glass surfaces — the AI-slop
 * visual signature called out in the audit. Rewritten with the
 * same convention the Button + PageHeader use: inline CSS-var
 * colors via the ``--gx-*`` tokens, single-hue per variant,
 * modest ``--r-*`` radii.
 *
 * Variants:
 *   * ``default`` — line border + subtle bg (the canonical neutral)
 *   * ``neutral`` — line border, transparent (lightest weight)
 *   * ``primary`` — --gx-accent
 *   * ``success`` — --gx-success
 *   * ``warning`` — --warning
 *   * ``info``    — --gx-info
 *   * ``danger``  — --danger
 *
 * Sizes pin border-radius to the radius token table:
 *   * ``sm`` — h-7, --r-sm (5px)
 *   * ``md`` — h-9, --r-md (7px)
 *   * ``lg`` — h-11, --r-md (7px — stays at the functional-surface ceiling)
 *
 * Round chip aesthetics belong on pill-shaped chips
 * (``rounded-full`` on text-only chips), not on square icon
 * plates.
 */

type IconBadgeVariant =
  | 'default'
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
type IconBadgeSize = 'sm' | 'md' | 'lg'

const sizeClass: Record<IconBadgeSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
}

const sizeRadius: Record<IconBadgeSize, string> = {
  sm: 'var(--r-sm)',
  md: 'var(--r-md)',
  lg: 'var(--r-md)',
}

interface VariantTokens {
  background: string
  border: string
  color: string
}

const variantTokens: Record<IconBadgeVariant, VariantTokens> = {
  default: {
    background: 'var(--bg-elev)',
    border: 'var(--line)',
    color: 'var(--fg)',
  },
  neutral: {
    background: 'transparent',
    border: 'var(--line)',
    color: 'var(--fg-muted)',
  },
  primary: {
    background: 'var(--gx-accent-glow)',
    border: 'var(--gx-accent-dim)',
    color: 'var(--gx-accent)',
  },
  success: {
    background: 'transparent',
    border: 'var(--gx-success)',
    color: 'var(--gx-success)',
  },
  warning: {
    background: 'transparent',
    border: 'var(--warning)',
    color: 'var(--warning)',
  },
  info: {
    background: 'transparent',
    border: 'var(--gx-info)',
    color: 'var(--gx-info)',
  },
  danger: {
    background: 'transparent',
    border: 'var(--danger)',
    color: 'var(--danger)',
  },
}

export interface IconBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: IconBadgeVariant
  size?: IconBadgeSize
}

export function IconBadge({
  children,
  className,
  variant = 'default',
  size = 'md',
  style,
  ...props
}: IconBadgeProps) {
  const tokens = variantTokens[variant]
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center border',
        sizeClass[size],
        className,
      )}
      style={{
        background: tokens.background,
        borderColor: tokens.border,
        color: tokens.color,
        borderRadius: sizeRadius[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
