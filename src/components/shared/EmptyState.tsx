import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && <Icon className="h-10 w-10 text-text-tertiary mb-4" />}
      <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      {description && (
        <p className="text-xs text-text-secondary mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
