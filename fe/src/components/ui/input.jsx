import React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef(function Input(
  { className, type = 'text', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex min-h-11 w-full rounded-[0.65rem] border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-sm text-slate-950 shadow-sm backdrop-blur placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500/70 focus:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
        className
      )}
      {...props}
    />
  )
})
