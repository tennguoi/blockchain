import { cn } from '../../lib/utils'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'premium-card rounded-xl border border-slate-200/70 bg-white/80 shadow-[0_22px_46px_-32px_rgba(15,23,42,0.5)] backdrop-blur-xl',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('p-6 pb-2', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return (
    <h3 className={cn('text-lg font-bold tracking-normal text-slate-950', className)} {...props} />
  )
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-6 text-slate-500', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-4', className)} {...props} />
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}
