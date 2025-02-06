'use client'

import { type ToolbarItem } from '@/lib/types/command-center'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'

interface ToolbarProps {
  tools: ToolbarItem[]
}

export function Toolbar({ tools }: ToolbarProps) {
  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <Tooltip 
          key={tool.id}
          content={
            <div>
              <p>{tool.label}</p>
              {tool.shortcut && (
                <p className="text-xs text-gray-400">{tool.shortcut}</p>
              )}
            </div>
          }
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={tool.action}
            className="tool-button"
          >
            {tool.icon}
            <span className="text-sm">{tool.label}</span>
            {tool.shortcut && (
              <kbd className="ml-auto text-xs text-gray-400">
                {tool.shortcut}
              </kbd>
            )}
          </Button>
        </Tooltip>
      ))}
    </div>
  )
}
