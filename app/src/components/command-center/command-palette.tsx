'use client'

import { useState, useEffect } from 'react'
import { Command } from 'cmdk'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: {
    id: string
    label: string
    shortcut?: string
    action: () => void
  }[]
}

export function CommandPalette({ open, onOpenChange, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onOpenChange, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Command Menu</DialogTitle>
        <Command className="bg-gray-900">
          <div className="flex items-center border-b border-gray-800 px-3">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className={cn(
                'flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none',
                'placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50',
                'text-gray-100'
              )}
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No commands found.
            </Command.Empty>
            {commands.map((command) => (
              <Command.Item
                key={command.id}
                value={command.label}
                onSelect={() => {
                  command.action()
                  onOpenChange(false)
                }}
                className={cn(
                  'relative flex cursor-default select-none items-center rounded-sm px-3 py-2',
                  'text-gray-100 hover:bg-gray-800',
                  'aria-selected:bg-gray-800'
                )}
              >
                <span>{command.label}</span>
                {command.shortcut && (
                  <kbd className="ml-auto text-xs text-gray-500">
                    {command.shortcut}
                  </kbd>
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
