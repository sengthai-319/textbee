import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * HeroUI's button styles (the `button` classes from @heroui/styles) on a
 * native <button>, so every existing onClick, form submit and asChild link
 * keeps working. The variant names stay the app's; each maps to the HeroUI
 * variant with the same role.
 */
const buttonVariants = cva(
  "button [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "button--primary",
        destructive: "button--danger",
        outline: "button--outline",
        secondary: "button--tertiary",
        ghost: "button--ghost",
        link: "h-auto px-0 text-accent underline-offset-4 hover:underline active:scale-100 md:h-auto",
      },
      size: {
        default: "button--md",
        sm: "button--sm",
        lg: "button--lg",
        icon: "button--icon-only",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
