import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-[var(--radius)] text-body-sm font-medium tracking-tight transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary/95 via-primary to-primary/90 text-primary-foreground shadow-soft hover:shadow-medium dark:!text-slate-900",
        secondary:
          "bg-secondary/85 text-secondary-foreground shadow-soft hover:bg-secondary",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        outline:
          "border border-border/70 bg-background/40 text-foreground/90 shadow-soft hover:bg-muted/40",
        ghost:
          "bg-transparent text-foreground/75 hover:text-foreground hover:bg-muted/30",
        link:
          "underline-offset-4 text-primary hover:underline",
        glass:
          "backdrop-blur-panel border-2 border-border/40 bg-background/60 text-foreground shadow-soft hover:bg-background/80 hover:border-border/60 dark:border-white/15 dark:bg-white/8 dark:hover:bg-white/12 dark:hover:border-white/25",
        cta:
          "bg-[linear-gradient(135deg,rgba(59,194,255,0.96),rgba(45,212,191,0.98))] !text-slate-900 shadow-[0_16px_32px_rgba(15,118,110,0.28)] before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-white/30 before:opacity-0 before:transition-opacity before:duration-200 hover:shadow-[0_22px_42px_rgba(14,116,144,0.36)] hover:before:opacity-35 focus-visible:ring-primary/45 focus-visible:ring-offset-0 dark:border-0 dark:bg-gradient-to-r dark:from-teal-400 dark:to-cyan-400 dark:!text-slate-900 dark:shadow-md dark:hover:shadow-lg dark:before:bg-white/20 dark:hover:before:opacity-100 font-semibold",
        subtle:
          "bg-muted/60 text-foreground/80 shadow-soft hover:bg-muted",
        success:
          "bg-success/90 text-success-foreground shadow-soft hover:bg-success dark:!text-slate-900",
        warning:
          "bg-warning/90 text-warning-foreground shadow-soft hover:bg-warning",
        info:
          "bg-info/90 text-info-foreground shadow-soft hover:bg-info dark:!text-slate-900",
        neutral:
          "bg-neutral/25 text-neutral-foreground shadow-soft hover:bg-neutral/35",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-body-xs rounded-[calc(var(--radius)-4px)]",
        lg: "h-11 px-6 text-body rounded-[calc(var(--radius)+2px)]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants } 
