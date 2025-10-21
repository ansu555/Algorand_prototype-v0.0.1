import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-red-600 text-white hover:bg-red-700 dark:bg-[#F3C623] dark:text-black dark:hover:bg-[#F3C623]/90",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:text-white dark:hover:bg-red-800",
        outline:
          "border border-red-600/40 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-[#F3C623]/20 dark:bg-transparent dark:text-[#F3C623] dark:hover:border-[#F3C623]/40 dark:hover:bg-[#F3C623]/10 dark:hover:text-[#F3C623]",
        secondary:
          "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-[#F3C623]/20 dark:text-[#F3C623] dark:hover:bg-[#F3C623]/30",
        ghost: "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-[#F3C623] dark:hover:bg-[#F3C623]/10 dark:hover:text-[#F3C623]",
        link: "text-red-600 underline-offset-4 hover:underline dark:text-[#F3C623] dark:hover:text-[#F3C623]/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
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
