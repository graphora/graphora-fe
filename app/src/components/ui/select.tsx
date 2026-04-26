import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Select primitive themed to Graphora design tokens.
 *
 * Why inline styles for the surfaces? Radix Select portals its content into
 * `<body>` — outside the `.light` / `.dark` theme class scope on the page
 * root. Using Tailwind's `bg-popover` (which resolves to
 * `rgb(var(--popover) / <alpha-value>)`) can render transparent when the CSS
 * variable isn't resolved in the portal's context, or when a parent passes
 * an `opacity` that cascades. Explicit `style={{ background: 'var(--...)' }}`
 * always wins, so the dropdown is guaranteed to be solid against the page.
 */
const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-[var(--r-sm)] px-3 py-2 text-[12.5px]",
      "placeholder:text-[color:var(--fg-faint)]",
      "focus:outline-none focus:ring-1 focus:ring-[color:var(--gx-accent)] focus:border-[color:var(--gx-accent)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "[&>span]:line-clamp-1",
      className,
    )}
    style={{
      background: "var(--bg-deep)",
      border: "1px solid var(--line-strong)",
      color: "var(--fg)",
    }}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4" style={{ color: "var(--fg-muted)" }} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-[100] min-w-[8rem] overflow-hidden rounded-[var(--r-sm)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line-strong)",
        color: "var(--fg)",
        boxShadow: "var(--shadow-2)",
      }}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-[11px] font-medium uppercase tracking-[0.08em]", className)}
    style={{ color: "var(--fg-faint)" }}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-[3px] py-1.5 pl-8 pr-2 text-[12.5px] outline-none",
      "data-[highlighted]:bg-[color:var(--bg-elev-2)] data-[highlighted]:text-[color:var(--fg)]",
      "data-[state=checked]:text-[color:var(--gx-accent)]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    style={{ color: "var(--fg)" }}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5" style={{ color: "var(--gx-accent)" }} />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px", className)}
    style={{ background: "var(--line)" }}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}
