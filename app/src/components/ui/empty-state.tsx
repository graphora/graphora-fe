import { LucideIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex h-[450px] shrink-0 items-center justify-center',
        className
      )}
    >
      <div className="mx-auto flex max-w-[420px] flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <Icon className="h-10 w-10 text-gray-500" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {description}
        </p>
        {action && (
          <Button
            className="mt-4"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
