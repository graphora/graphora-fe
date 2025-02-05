import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  className?: string
}

export function LoadingOverlay({ isLoading, message, className }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div 
      className={cn(
        'fixed inset-0 bg-white/80 backdrop-blur-sm',
        'flex flex-col items-center justify-center gap-4',
        'z-50',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      {message && (
        <p className="text-sm text-gray-600">{message}</p>
      )}
    </div>
  )
}
