import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center rounded-[var(--border-radius)] text-body-sm font-medium tracking-tight transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-primary/92 text-primary-foreground shadow-soft hover:bg-primary hover:shadow-medium active:translate-y-[1px]",
        secondary:
          "bg-secondary/80 text-secondary-foreground shadow-soft hover:bg-secondary active:translate-y-[1px]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 active:translate-y-[1px]",
        outline:
          "border border-border/70 bg-transparent text-foreground/90 hover:bg-muted/40 hover:text-foreground",
        ghost:
          "bg-transparent text-foreground/80 hover:text-foreground hover:bg-muted/40",
        link:
          "underline-offset-4 text-primary hover:underline",
        glass:
          "glass-button text-foreground/90 hover:bg-glass-overlay",
        subtle:
          "bg-muted/70 text-foreground/80 shadow-soft hover:bg-muted",
        success:
          "bg-success/90 text-success-foreground shadow-soft hover:bg-success",
        warning:
          "bg-warning/90 text-warning-foreground shadow-soft hover:bg-warning",
        info:
          "bg-info/90 text-info-foreground shadow-soft hover:bg-info",
        neutral:
          "bg-neutral/30 text-neutral-foreground shadow-soft hover:bg-neutral/40",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 rounded-[12px] px-3 text-body-xs",
        lg: "h-11 rounded-[16px] px-6 text-body",
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
