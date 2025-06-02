'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface LogoProps {
  width?: number
  height?: number
  className?: string
  alt?: string
}

export function Logo({ 
  width = 32, 
  height = 32, 
  className,
  alt = "Graphora Logo" 
}: LogoProps) {
  const { resolvedTheme } = useTheme()
  
  // Default to light logo for SSR
  const logoSrc = resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png'

  return (
    <img 
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-contain", className)}
    />
  )
} 