import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-black/[0.06] text-text-secondary',
        secondary:
          'bg-black/[0.04] text-text-tertiary',
        destructive:
          'bg-danger/8 text-danger',
        outline:
          'border border-black/[0.08] text-text-secondary',
        success:
          'bg-black/[0.06] text-text-secondary',
        warning:
          'bg-black/[0.06] text-text-secondary',
        info:
          'bg-black/[0.06] text-text-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
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
