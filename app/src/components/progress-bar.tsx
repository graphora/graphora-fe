'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  status: string
  className?: string
}

export function ProgressBar({ progress, status, className }: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="h-1 w-full bg-gray-100 relative overflow-hidden">
        {/* Shimmer effect */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{
            animation: 'shimmer 2s infinite',
            transform: 'translateX(-100%)',
          }}
        />
        {/* Progress fill */}
        <div
          className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* Status text */}
      <div className="mt-2 flex justify-between items-center text-sm">
        <span className="font-medium">{status}</span>
        <span className="text-gray-500">{progress}% Complete</span>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}
