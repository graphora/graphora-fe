import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-body-xs font-semibold tracking-wide uppercase transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/90 text-primary-foreground shadow-soft hover:bg-primary",
        secondary:
          "border-transparent bg-secondary/80 text-secondary-foreground shadow-soft hover:bg-secondary",
        destructive:
          "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/20",
        success:
          "border-success/30 bg-success/15 text-success hover:bg-success/25",
        warning:
          "border-warning/30 bg-warning/15 text-warning hover:bg-warning/25",
        info:
          "border-info/30 bg-info/15 text-info hover:bg-info/25",
        neutral:
          "border-neutral/25 bg-neutral/10 text-neutral-foreground hover:bg-neutral/20",
        muted:
          "border-border/50 bg-muted text-muted-foreground",
        outline: "border-border text-foreground",
        glass: "glass-surface border-transparent text-foreground/80 shadow-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
