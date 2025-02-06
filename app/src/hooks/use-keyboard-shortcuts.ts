'use client'

import { useEffect } from 'react'
import { KEYBOARD_SHORTCUTS } from '@/lib/types/command-center'

type ShortcutHandlers = {
  [K in keyof typeof KEYBOARD_SHORTCUTS]: () => void
}

export function useKeyboardShortcuts(handlers: Partial<ShortcutHandlers>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Convert key combination to shortcut string
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const ctrl = isMac ? e.metaKey : e.ctrlKey
      const alt = e.altKey
      const key = e.key.toLowerCase()

      let shortcut = ''
      if (ctrl) shortcut += 'cmd+'
      if (alt) shortcut += 'alt+'
      shortcut += key

      // Find and execute matching handler
      const action = KEYBOARD_SHORTCUTS[shortcut as keyof typeof KEYBOARD_SHORTCUTS]
      if (action && handlers[action]) {
        e.preventDefault()
        handlers[action]?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
