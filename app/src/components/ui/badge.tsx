import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] uppercase transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/90 text-primary-foreground shadow-soft hover:bg-primary",
        secondary:
          "border-transparent bg-secondary/80 text-secondary-foreground shadow-soft hover:bg-secondary",
        destructive:
          "border-destructive/35 bg-destructive/15 text-destructive hover:bg-destructive/20",
        success:
          "border-success/30 bg-success/15 text-success hover:bg-success/20",
        warning:
          "border-warning/30 bg-warning/15 text-warning hover:bg-warning/20",
        info:
          "border-info/30 bg-info/15 text-info hover:bg-info/20",
        neutral:
          "border-neutral/25 bg-neutral/12 text-neutral-foreground hover:bg-neutral/20",
        muted:
          "border-border/40 bg-muted text-muted-foreground",
        outline: "border-border/70 bg-background/60 text-foreground",
        glass: "border-white/20 bg-white/8 text-foreground/80 shadow-glass backdrop-blur-panel",
      },
      tone: {
        solid: "",
        soft: "border-transparent bg-foreground/10 text-foreground/80",
      }
    },
    defaultVariants: {
      variant: "default",
      tone: "solid",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, tone }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
