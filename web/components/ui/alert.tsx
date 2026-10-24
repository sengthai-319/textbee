import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-2xl border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "border-transparent bg-surface text-foreground shadow-surface",
        destructive:
          "border-transparent bg-danger-soft text-danger-soft-foreground [&>svg]:text-danger",
        // Tones for the notification engine. These are the tinted-surface
        // patterns the alert components already used inline; naming them here
        // stops each one hand-writing its own and lets an authored record pick
        // one by name. Semantic utilities only, so the same markup renders
        // identically where it is mirrored on an older Tailwind.
        info: "border-transparent bg-surface text-foreground shadow-surface",
        success: "border-transparent bg-success-soft text-foreground [&>svg]:text-success",
        warning: "border-transparent bg-warning-soft text-foreground [&>svg]:text-warning",
        critical:
          "border-transparent bg-danger-soft text-foreground [&>svg]:text-danger",
        promo: "border-transparent bg-accent-soft text-foreground [&>svg]:text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
