import { formatCurrency } from '@/lib/utils'

interface KPICardProps {
  title: string
  amount: number
  subtitle?: string
  color?: 'blue' | 'red' | 'green' | 'yellow'
}

export function KPICard({ title, amount, subtitle, color = 'green' }: KPICardProps) {
  const colorMap = {
    blue:   { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    red:    { text: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-100' },
    green:  { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    yellow: { text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
  }

  const styles = colorMap[color]

  return (
    <div className="p-6 bg-white border border-zen-border rounded-2xl zen-shadow transition-all hover:scale-[1.01]">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em]">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-black tracking-tight ${styles.text}`}>
            {formatCurrency(amount)}
          </p>
        </div>
        {subtitle && (
          <p className="text-[10px] font-medium text-slate-400 mt-2">
            {subtitle}
          </p>
        )}
      </div>
      <div className={`mt-4 h-1 w-full rounded-full ${styles.bg}`}>
        <div className={`h-full rounded-full ${color === 'green' ? 'bg-zen-accent' : styles.text.replace('text-', 'bg-')}`} style={{ width: '40%' }} />
      </div>
    </div>
  )
}
