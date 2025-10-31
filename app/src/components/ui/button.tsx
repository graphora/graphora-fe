import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center rounded-[var(--radius)] text-body-sm font-medium tracking-tight transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary/95 via-primary to-primary/90 text-primary-foreground shadow-soft hover:shadow-medium",
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
          "backdrop-blur-panel border border-white/15 bg-white/8 text-foreground/90 shadow-glass hover:bg-white/12 hover:border-white/25",
        subtle:
          "bg-muted/60 text-foreground/80 shadow-soft hover:bg-muted",
        success:
          "bg-success/90 text-success-foreground shadow-soft hover:bg-success",
        warning:
          "bg-warning/90 text-warning-foreground shadow-soft hover:bg-warning",
        info:
          "bg-info/90 text-info-foreground shadow-soft hover:bg-info",
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
