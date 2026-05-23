import React from 'react'
import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-slate-800 text-slate-100',
  success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  danger: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
  warning: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
}

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

