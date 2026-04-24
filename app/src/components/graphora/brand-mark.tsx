import * as React from 'react'

type BrandMarkProps = {
  size?: number
  className?: string
}

export function BrandMark({ size = 22, className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 22 22"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6L16 16M6 16L16 6" stroke="var(--line-strong)" strokeWidth="1" />
      <circle cx="6" cy="6" r="2.3" fill="var(--gx-accent)" />
      <circle cx="16" cy="16" r="2.3" fill="var(--edge)" />
      <circle cx="16" cy="6" r="1.6" fill="var(--bg-elev)" stroke="var(--gx-accent)" strokeWidth="1.2" />
      <circle cx="6" cy="16" r="1.6" fill="var(--bg-elev)" stroke="var(--edge)" strokeWidth="1.2" />
    </svg>
  )
}
