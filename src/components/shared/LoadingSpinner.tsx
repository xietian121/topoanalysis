import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-accent border-t-transparent animate-spin',
          sizeMap[size],
        )}
      />
      {text && <p className="text-xs text-text-secondary">{text}</p>}
    </div>
  )
}
