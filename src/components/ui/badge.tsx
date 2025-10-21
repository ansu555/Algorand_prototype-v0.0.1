import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-[#F3C623] dark:text-black dark:hover:bg-[#F3C623]/90",
        secondary:
          "border-transparent bg-red-50 text-red-600 hover:bg-red-100 dark:bg-[#F3C623]/70 dark:text-black dark:hover:bg-[#F3C623]/60",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700",
        outline: "text-red-600 border-red-600/40 hover:bg-red-50 dark:text-[#F3C623] dark:border-[#F3C623]/40 dark:hover:bg-[#F3C623]/10",
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
