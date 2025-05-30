import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const TooltipRoot = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipContent = TooltipPrimitive.Content

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export function Tooltip({ 
  children, 
  content,
  side = 'top',
  align = 'center'
}: TooltipProps) {
  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span>{children}</span>
        </TooltipTrigger>
        <TooltipPrimitive.Portal>
          <TooltipContent
            side={side}
            align={align}
            className={cn(
              'z-50 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2',
              'text-sm font-medium text-slate-900 shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2',
              'data-[side=top]:slide-in-from-bottom-2',
              // Theme support for future implementation
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-white dark:fill-slate-800" />
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </TooltipRoot>
    </TooltipProvider>
  )
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent }
