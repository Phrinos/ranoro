
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: // For "Agendado" - uses primary color (red in current theme)
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: // For "En Progreso" - uses secondary color (light gray in current theme)
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: // For "Cancelado"
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: // For "Pendiente" - white/transparent with border
          "text-foreground",
        success: // For "Completado" and "Efectivo" - green
          "border-transparent bg-green-600 text-primary-foreground hover:bg-green-600/80",
        purple: // For "Tarjeta"
          "border-transparent bg-purple-500 text-white hover:bg-purple-500/80 dark:bg-purple-600 dark:hover:bg-purple-600/80",
        blue: // For "Transferencia"
          "border-transparent bg-blue-500 text-white hover:bg-blue-500/80 dark:bg-blue-600 dark:hover:bg-blue-600/80",
        lightGreen: // For "Efectivo+Transferencia"
          "border-transparent bg-green-300 text-green-800 hover:bg-green-300/80 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-700/80",
        lightPurple: // For "Tarjeta+Transferencia"
          "border-transparent bg-purple-300 text-purple-800 hover:bg-purple-300/80 dark:bg-purple-700 dark:text-purple-100 dark:hover:bg-purple-700/80",
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
