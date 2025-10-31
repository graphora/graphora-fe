import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive shadow-sm hover:bg-destructive/20",
        success:
          "border-success/30 bg-success/15 text-success shadow-sm hover:bg-success/20",
        warning:
          "border-warning/30 bg-warning/15 text-warning shadow-sm hover:bg-warning/20",
        info:
          "border-info/30 bg-info/15 text-info shadow-sm hover:bg-info/20",
        neutral:
          "border-neutral/30 bg-neutral/15 text-neutral-foreground shadow-sm hover:bg-neutral/20",
        muted:
          "border-transparent bg-muted text-muted-foreground",
        outline: "border-border text-foreground",
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
