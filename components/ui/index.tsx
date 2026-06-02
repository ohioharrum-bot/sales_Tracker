import React from 'react'
import { cn } from '@/lib/utils'

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
      secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
      danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm',
    }
    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs font-semibold',
      md: 'px-4 py-2 text-sm font-semibold',
      lg: 'px-5 py-2.5 text-base font-semibold',
    }
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden', className)}>
    {children}
  </div>
)

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(
  ({ className, label, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400',
          className
        )}
        {...props}
      />
    </div>
  )
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  ({ className, label, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400 min-h-[100px]',
          className
        )}
        {...props}
      />
    </div>
  )
)
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }>(
  ({ className, label, options, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%236B7280%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E")] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
)
Select.displayName = 'Select'

export const PageHeader = ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
      {description && <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>}
    </div>
    {action && <div className="flex items-center gap-2">{action}</div>}
  </div>
)

export const EmptyState = ({ message, action }: { message: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
      <div className="w-8 h-8 border-2 border-slate-300 rounded-sm" />
    </div>
    <p className="text-slate-600 text-sm font-medium mb-6 max-w-[240px] leading-relaxed">{message}</p>
    {action && action}
  </div>
)

export const Badge = ({ label, variant = 'gray' }: { label: string; variant?: 'green' | 'blue' | 'yellow' | 'gray' | 'red' }) => {
  const variants = {
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    yellow: 'bg-amber-100 text-amber-700 border-amber-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
    red: 'bg-rose-100 text-rose-700 border-rose-200',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', variants[variant])}>
      {label}
    </span>
  )
}
