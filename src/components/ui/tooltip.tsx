import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltip() {
  const ctx = React.useContext(TooltipContext)
  if (!ctx) throw new Error('Tooltip components must be used within <TooltipProvider>')
  return ctx
}

function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      {children}
    </TooltipContext.Provider>
  )
}

function Tooltip({ children }: { children: React.ReactNode }) {
  const [_open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open: _open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  )
}

function TooltipTrigger({
  children,
  asChild,
  ...props
}: React.HTMLAttributes<HTMLElement> & { asChild?: boolean }) {
  const { setOpen } = useTooltip()

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{
      onMouseEnter?: React.MouseEventHandler
      onMouseLeave?: React.MouseEventHandler
      onFocus?: React.FocusEventHandler
      onBlur?: React.FocusEventHandler
    }>, {
      onMouseEnter: (e: React.MouseEvent) => {
        setOpen(true)
        const el = children as React.ReactElement<{ onMouseEnter?: React.MouseEventHandler }>
        el.props.onMouseEnter?.(e)
      },
      onMouseLeave: (e: React.MouseEvent) => {
        setOpen(false)
        const el = children as React.ReactElement<{ onMouseLeave?: React.MouseEventHandler }>
        el.props.onMouseLeave?.(e)
      },
      onFocus: (e: React.FocusEvent) => {
        setOpen(true)
        const el = children as React.ReactElement<{ onFocus?: React.FocusEventHandler }>
        el.props.onFocus?.(e)
      },
      onBlur: (e: React.FocusEvent) => {
        setOpen(false)
        const el = children as React.ReactElement<{ onBlur?: React.FocusEventHandler }>
        el.props.onBlur?.(e)
      },
    })
  }

  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      {...props}
    >
      {children}
    </span>
  )
}

function TooltipContent({
  className,
  side = 'top',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { side?: 'top' | 'bottom' | 'left' | 'right' }) {
  const { open } = useTooltip()
  if (!open) return null

  const sideStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      className={cn(
        'absolute z-50 rounded-md bg-surface-tertiary px-3 py-1.5 text-xs text-text-primary shadow-md',
        sideStyles[side],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
