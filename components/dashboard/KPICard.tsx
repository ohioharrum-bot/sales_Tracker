import { Card } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  amount: number
  subtitle?: string
  color?: 'blue' | 'red' | 'green' | 'yellow'
}

export const KPICard = ({ title, amount, subtitle, color = 'blue' }: KPICardProps) => {
  const colorClasses = {
    blue:   { text: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
    red:    { text: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-100' },
    green:  { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    yellow: { text: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100' },
  }

  const current = colorClasses[color]

  return (
    <Card className={cn('p-5 border-l-4 transition-all hover:translate-y-[-2px] hover:shadow-md', current.border)}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <p className={cn('text-2xl font-black tracking-tight', current.text)}>
          {formatCurrency(amount)}
        </p>
      </div>
      {subtitle && (
        <p className="mt-2 text-[10px] font-semibold text-slate-400 italic">{subtitle}</p>
      )}
    </Card>
  )
}
