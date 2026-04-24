'use client'

import * as React from 'react'
import { Command } from 'cmdk'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

export interface CommandItem {
  id: string
  label: string
  description?: string
  group?: string
  shortcut?: string
  icon?: React.ReactNode
  keywords?: string[]
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: CommandItem[]
  placeholder?: string
}

/**
 * Command palette — ⌘K quick nav + actions.
 *
 * Restyled to the Graphora token system (OKLCH accent + --bg-elev /
 * --line / --fg-* tokens) so it stops looking like a stock shadcn
 * recipe. Groups items by `command.group` if provided; otherwise
 * renders a single flat list.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = 'Search pages, actions…',
}: CommandPaletteProps) {
  const [search, setSearch] = React.useState('')

  // Global ⌘K / Ctrl+K toggle.
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onOpenChange, open])

  // Clear search on close so re-opening starts fresh.
  React.useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const grouped = React.useMemo(() => {
    const byGroup = new Map<string, CommandItem[]>()
    for (const cmd of commands) {
      const key = cmd.group || 'Commands'
      const bucket = byGroup.get(key) || []
      bucket.push(cmd)
      byGroup.set(key, bucket)
    }
    return Array.from(byGroup.entries())
  }, [commands])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden sm:max-w-xl"
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <DialogTitle className="sr-only">Command Menu</DialogTitle>
        <Command
          shouldFilter
          className="flex flex-col"
          style={{ background: 'transparent' }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <Search className="h-[14px] w-[14px]" style={{ color: 'var(--fg-faint)' }} />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={placeholder}
              className={cn(
                'flex h-9 flex-1 bg-transparent outline-none',
                'placeholder:text-[color:var(--fg-faint)]',
              )}
              style={{
                color: 'var(--fg)',
                fontSize: '13.5px',
                letterSpacing: '-0.01em',
              }}
            />
            <kbd
              className="gx-mono"
              style={{
                fontSize: 10,
                padding: '2px 6px',
                color: 'var(--fg-faint)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                background: 'var(--bg-deep)',
              }}
            >
              ESC
            </kbd>
          </div>

          <Command.List
            className="overflow-y-auto"
            style={{ maxHeight: 360, padding: '6px 6px 8px' }}
          >
            <Command.Empty
              className="text-center"
              style={{
                padding: '24px 12px',
                fontSize: 12,
                color: 'var(--fg-muted)',
              }}
            >
              No matches.
            </Command.Empty>

            {grouped.map(([groupName, items], groupIdx) => (
              <Command.Group
                key={groupName}
                heading={groupName}
                style={{ paddingTop: groupIdx === 0 ? 4 : 10 }}
                className="gx-palette-group"
              >
                {items.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.keywords?.join(' ') || ''}`}
                    onSelect={() => {
                      cmd.action()
                      onOpenChange(false)
                    }}
                    className="gx-palette-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 10px',
                      fontSize: '13px',
                      borderRadius: 'var(--r-sm)',
                      color: 'var(--fg)',
                      cursor: 'pointer',
                    }}
                  >
                    {cmd.icon && (
                      <span
                        style={{
                          flex: '0 0 14px',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'var(--fg-muted)',
                        }}
                      >
                        {cmd.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {cmd.description && (
                      <span
                        className="truncate"
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-faint)',
                          maxWidth: 180,
                        }}
                      >
                        {cmd.description}
                      </span>
                    )}
                    {cmd.shortcut && (
                      <kbd
                        className="gx-mono"
                        style={{
                          marginLeft: 'auto',
                          fontSize: 10,
                          padding: '1px 5px',
                          color: 'var(--fg-faint)',
                          border: '1px solid var(--line)',
                          borderRadius: 4,
                          background: 'var(--bg-deep)',
                        }}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
