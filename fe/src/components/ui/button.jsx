import React from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = {
  variant: {
    default:
      'border-transparent bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_18px_34px_-20px_rgba(37,99,235,0.88)] hover:from-blue-700 hover:to-blue-800 hover:shadow-[0_22px_38px_-20px_rgba(37,99,235,0.95)] focus-visible:ring-blue-500/30',
    outline:
      'border-slate-200/80 bg-white/80 text-slate-700 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)] hover:border-blue-200 hover:bg-blue-50/80 hover:text-slate-950 focus-visible:ring-blue-500/25',
    danger:
      'border-transparent bg-gradient-to-b from-red-600 to-red-700 text-white shadow-[0_18px_34px_-20px_rgba(220,38,38,0.78)] hover:from-red-700 hover:to-red-800 focus-visible:ring-red-500/25',
    success:
      'border-transparent bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-[0_18px_34px_-20px_rgba(22,163,74,0.78)] hover:from-emerald-700 hover:to-emerald-800 focus-visible:ring-emerald-500/25',
    ghost:
      'border-transparent bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 focus-visible:ring-blue-500/25',
  },
  size: {
    sm: 'min-h-9 px-3 text-sm',
    md: 'min-h-11 px-4 text-sm',
    lg: 'min-h-12 px-5 text-base',
    icon: 'h-11 w-11',
  },
}

export function Button({
  asChild = false,
  children,
  className,
  variant = 'default',
  size = 'md',
  type = 'button',
  ...props
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-[0.65rem] border font-bold leading-none transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60',
    buttonVariants.variant[variant],
    buttonVariants.size[size],
    className
  )

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(classes, children.props.className),
      ...props,
    })
  }

  return (
    <button
      type={type}
      className={classes}
      {...props}
    >
      {children}
    </button>
  )
}
