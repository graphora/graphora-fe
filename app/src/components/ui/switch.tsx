"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

/**
 * Switch — flat token-driven on/off control.
 *
 * Design audit cleanup: the previous "on" state was a
 * gradient from emerald-500 to emerald-600 (emerald-400→500 in
 * dark mode) — multi-color gradient on a functional surface,
 * one of the AI-slop tells the audit flagged. P0 fix
 * replaces with a flat ``--gx-accent`` fill, matching the
 * Button + IconBadge palette.
 *
 * P2 follow-up: the thumb's previous ``shadow-lg`` is heavier
 * than the rest of the system uses. Stepped down to a softer
 * shadow consistent with the line-weight aesthetic of the
 * other primitives.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, style, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // ``data-state-*`` attribute selectors with inline CSS
      // vars get applied via ``style`` below — the off state
      // is the default, the on state is set via the
      // ``data-[state=checked]`` modifier on the class string
      // for the background color tokenization to actually
      // resolve.
      "border-[var(--line)] bg-[var(--bg-elev-2)]",
      "data-[state=checked]:border-[var(--gx-accent)] data-[state=checked]:bg-[var(--gx-accent)]",
      "focus-visible:ring-[var(--gx-accent)]",
      className,
    )}
    style={style}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background ring-0 transition-transform",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
      // P2 audit fix: shadow-lg replaced with a flatter
      // shadow-sm via inline box-shadow — keeps the thumb
      // visually anchored on the track without the AI-style
      // heavy drop shadow.
      style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.12)' }}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
