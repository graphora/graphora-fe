"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * TabsList — horizontal row of tabs with a bottom border line.
 *
 * Uses inline style for `borderBottom` rather than Tailwind arbitrary classes;
 * inline styles always win and don't depend on the JIT scanner.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("flex w-full flex-wrap items-end gap-0", className)}
    style={{ borderBottom: "1px solid var(--line)", ...style }}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/**
 * TabsTrigger — inactive tabs muted, active tab gets an accent underline.
 *
 * State-driven colors via inline-style helpers — the `data-[state=active]`
 * selector applies a CSS class that flips `--tab-active` which is consumed by
 * inline `var()` reference. Keeps the visual contract token-driven without
 * requiring Tailwind JIT arbitrary-value compilation.
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "gx-tab inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-[12.5px] font-medium",
      "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      "transition-colors -mb-px",
      className,
    )}
    style={style}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
