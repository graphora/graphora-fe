import * as React from 'react'
import { cn } from '@/lib/utils'

type NodeDotTone = 'default' | 'edge' | 'warn' | 'danger' | 'info' | 'success'

type NodePillProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: NodeDotTone
  children: React.ReactNode
}

/**
 * Graphora node-pill — rounded chip with a colored dot on the left.
 * Reserved for entity labels, inline references to graph nodes, and list-row
 * leads. The trailing text is set in mono to read as a graph identifier.
 */
export function NodePill({ tone = 'default', className, children, ...rest }: NodePillProps) {
  return (
    <span className={cn('gx-node-pill', className)} {...rest}>
      <span className={cn('dot', tone !== 'default' && tone)} />
      <span>{children}</span>
    </span>
  )
}
