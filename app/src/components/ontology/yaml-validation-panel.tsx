"use client"

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AlertCircle, AlertTriangle, Info, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ValidationPanelProps {
  errors: string[]
  warnings: string[]
  info: string[]
  onJumpToLocation?: (message: string) => void
  className?: string
}

export function YAMLValidationPanel({
  errors,
  warnings,
  info,
  onJumpToLocation,
  className
}: ValidationPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<'errors' | 'warnings' | 'info'>('errors')

  // Auto-expand on validation changes
  useEffect(() => {
    if (errors.length > 0 || warnings.length > 0) {
      setIsOpen(true)
      setActiveSection(errors.length > 0 ? 'errors' : 'warnings')
    }
  }, [errors, warnings])

  const renderValidationSection = (
    title: string,
    messages: string[],
    icon: React.ReactNode,
    variant: 'destructive' | 'warning' | 'default'
  ) => {
    if (messages.length === 0) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-medium">{title}</h3>
          </div>
          <Badge variant={variant}>{messages.length}</Badge>
        </div>
        <div className="space-y-2">
          {messages.map((message, index) => (
            <Alert
              key={index}
              variant={variant}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onJumpToLocation?.(message)}
            >
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('w-full space-y-2', className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-between p-2"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Validation</h2>
            {errors.length > 0 && (
              <Badge variant="destructive">{errors.length}</Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="warning">{warnings.length}</Badge>
            )}
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <ScrollArea className="h-[300px] rounded-md border">
          <div className="space-y-4 p-4">
            {renderValidationSection(
              'Errors',
              errors,
              <AlertCircle className="h-4 w-4 text-destructive" />,
              'destructive'
            )}
            {renderValidationSection(
              'Warnings',
              warnings,
              <AlertTriangle className="h-4 w-4 text-yellow-500" />,
              'warning'
            )}
            {renderValidationSection(
              'Info',
              info,
              <Info className="h-4 w-4 text-blue-500" />,
              'default'
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  )
}
