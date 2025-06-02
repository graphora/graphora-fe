'use client'

import React, { useState, useEffect } from 'react'
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
  const [mounted, setMounted] = useState(false)

  // Handle hydration by waiting for component to mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and before hydration, show light logo as default
  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png'

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