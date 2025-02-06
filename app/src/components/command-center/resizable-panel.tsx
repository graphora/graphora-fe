'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ResizablePanelProps {
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  children: React.ReactNode
  onResize?: (width: number) => void
}

export function ResizablePanel({
  defaultWidth = 320,
  minWidth = 280,
  maxWidth = 480,
  children,
  onResize
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const newWidth = e.clientX
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth)
        onResize?.(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth, onResize])

  return (
    <div
      ref={panelRef}
      className="relative flex h-full"
      style={{ width: `${width}px` }}
    >
      {children}
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-1 cursor-col-resize',
          'hover:bg-blue-500/50',
          isResizing && 'bg-blue-500'
        )}
        onMouseDown={() => setIsResizing(true)}
        onDoubleClick={() => {
          setWidth(defaultWidth)
          onResize?.(defaultWidth)
        }}
      />
    </div>
  )
}
