'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ModeCard {
  title: string
  subtitle: string
  icon: ReactNode
  features: string[]
  ctaText: string
}

interface ModeCardProps extends ModeCard {
  selected?: boolean
  onClick?: () => void
}

export function ModeCard({ 
  title, 
  subtitle, 
  icon, 
  features, 
  ctaText, 
  selected,
  onClick 
}: ModeCardProps) {
  return (
    <div
      className={cn(
        "mode-card",
        "bg-white rounded-xl p-6",
        "border-2 border-transparent",
        "transition-all duration-300",
        "hover:border-blue-500 hover:shadow-lg hover:scale-[1.02]",
        "cursor-pointer",
        "flex flex-col",
        "min-w-[300px] max-w-[400px]",
        selected && "border-blue-500 shadow-lg"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.()
        }
      }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="text-blue-500 w-12 h-12">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-gray-600">{subtitle}</p>
        </div>
      </div>

      <ul className="space-y-2 mt-4 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <svg 
              className="w-5 h-5 text-green-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button 
        className={cn(
          "mt-6 w-full py-2 px-4 rounded-lg",
          "bg-blue-500 text-white",
          "hover:bg-blue-600",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        )}
      >
        {ctaText}
      </button>
    </div>
  )
}
