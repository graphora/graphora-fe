import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Graphora button system — flat, token-driven variants.
 *
 * ## Why inline-style CSS-var backgrounds
 *
 * Tailwind's `<alpha-value>` expansion in `tailwind.config.ts` appears to not
 * be generating the expected `rgb(var(--x) / var(--tw-bg-opacity))` output for
 * our custom colors — instead emitting `background-color: var(--background);`
 * which is invalid CSS (the var resolves to "27 32 43" — a bare RGB triplet
 * that isn't a color function). Result: every `bg-primary` / `bg-card` / etc.
 * rendered as `rgba(0, 0, 0, 0)` — transparent.
 *
 * Rather than fight the config, we use explicit inline `style={{ background:
 * 'var(--gx-accent)' }}` on each variant. The CSS variables themselves are OKLCH
 * color functions (e.g. `oklch(82% 0.155 200)`), so `var(--gx-accent)` resolves
 * directly to a valid color. Inline styles win over any class-based rule and
 * are immune to Tailwind's JIT or content-scanning quirks.
 *
 * Borders, rounding, transitions, and focus rings stay in Tailwind classes —
 * those work fine because they don't depend on the custom-color tokens.
 */

type Variant =
  | "default" | "cta"
  | "secondary" | "outline" | "ghost"
  | "destructive" | "danger"
  | "success" | "warning" | "info"
  | "subtle" | "neutral" | "glass"
  | "link"

const variantStyle: Record<Variant, React.CSSProperties> = {
  default:     { background: "var(--gx-accent)",     color: "var(--gx-accent-fg)", borderColor: "var(--gx-accent)" },
  cta:         { background: "var(--gx-accent)",     color: "var(--gx-accent-fg)", borderColor: "var(--gx-accent)" },
  secondary:   { background: "var(--bg-elev)",    color: "var(--fg)",        borderColor: "var(--line-strong)" },
  outline:     { background: "transparent",       color: "var(--fg)",        borderColor: "var(--line-strong)" },
  ghost:       { background: "transparent",       color: "var(--fg-muted)",  borderColor: "transparent" },
  destructive: { background: "var(--danger)",     color: "#fff",             borderColor: "var(--danger)" },
  danger:      { background: "transparent",       color: "var(--danger)",    borderColor: "color-mix(in oklch, var(--danger), transparent 70%)" },
  success:     { background: "var(--gx-success)",    color: "#fff",             borderColor: "var(--gx-success)" },
  warning:     { background: "var(--warn)",       color: "var(--gx-accent-fg)", borderColor: "var(--warn)" },
  info:        { background: "var(--gx-info)",       color: "#fff",             borderColor: "var(--gx-info)" },
  subtle:      { background: "var(--bg-elev)",    color: "var(--fg-muted)",  borderColor: "var(--line)" },
  neutral:     { background: "var(--bg-elev)",    color: "var(--fg)",        borderColor: "var(--line-strong)" },
  glass:       { background: "transparent",       color: "var(--fg)",        borderColor: "var(--line-strong)" },
  link:        { background: "transparent",       color: "var(--gx-accent)",    borderColor: "transparent" },
}

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-[var(--r-sm)] font-medium",
    "border transition-[filter,background-color,color,border-color] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    // Hover effects are wired via data-variant selectors in globals.css
  ].join(" "),
  {
    variants: {
      variant: {
        default: "gx-btn-solid",
        cta: "gx-btn-solid",
        secondary: "gx-btn-surface",
        outline: "gx-btn-surface",
        ghost: "gx-btn-ghost",
        destructive: "gx-btn-solid",
        danger: "gx-btn-danger",
        success: "gx-btn-solid",
        warning: "gx-btn-solid",
        info: "gx-btn-solid",
        subtle: "gx-btn-surface",
        neutral: "gx-btn-surface",
        glass: "gx-btn-surface",
        link: "gx-btn-link",
      },
      size: {
        default: "h-8 px-3.5 text-[12.5px]",
        sm: "h-7 px-2.5 text-[11.5px]",
        lg: "h-9 px-4 text-[13.5px]",
        icon: "h-8 w-8 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    const v = (variant ?? "default") as Variant
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ ...variantStyle[v], ...style }}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
