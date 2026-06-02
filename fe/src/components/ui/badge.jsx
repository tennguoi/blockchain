import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  primary: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
