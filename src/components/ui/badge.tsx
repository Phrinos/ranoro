
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
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-600 text-primary-foreground hover:bg-green-600/80",
        waiting: 
          "border-transparent bg-orange-500 text-white hover:bg-orange-500/80",
        delivered:
          "border-transparent bg-gray-500 text-white hover:bg-gray-500/80 dark:bg-gray-600",
        purple:
          "border-transparent bg-purple-500 text-white hover:bg-purple-500/80 dark:bg-purple-600 dark:hover:bg-purple-600/80",
        blue:
          "border-transparent bg-blue-500 text-white hover:bg-blue-500/80 dark:bg-blue-600 dark:hover:bg-blue-600/80",
        lightGreen:
          "border-transparent bg-green-300 text-green-800 hover:bg-green-300/80 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-700/80",
        lightPurple:
          "border-transparent bg-purple-300 text-purple-800 hover:bg-purple-300/80 dark:bg-purple-700 dark:text-purple-100 dark:hover:bg-purple-700/80",
        lightRed:
          "border-transparent bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-900/50 dark:text-red-300",
        teal:
          "border-transparent bg-teal-500 text-white hover:bg-teal-500/80",
        black: 
          "border-transparent bg-black text-white hover:bg-black/80",
        white:
          "border-gray-400/50 bg-gray-100 text-gray-800 hover:bg-gray-200",
        lightGray:
          "border-transparent bg-gray-200 text-gray-800 hover:bg-gray-300",
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
