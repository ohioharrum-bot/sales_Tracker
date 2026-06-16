'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, Button, Badge, EmptyState } from '@/components/ui'
import { DeleteButton } from '@/components/ui/DeleteButton'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sale, Expense, Payout } from '@/types'

// Minimalist SVG Icons
const ShoppingBagIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
)
const CreditCardIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
)
const ArrowUpRightIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
)
const PlusIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
)

type Activity = 
  | { type: 'sale';    data: Sale }
  | { type: 'expense'; data: Expense }
  | { type: 'payout';  data: Payout }

export default function StoreOverviewPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<Activity[]>([])
  
  const today = new Date().toISOString().split('T')[0]

  async function load() {
    setLoading(true)
    const [
      { data: sales },
      { data: expenses },
      { data: payouts },
      { data: ledger }
    ] = await Promise.all([
      supabase.from('sales').select('*').eq('store_id', storeId).eq('date', today),
      supabase.from('expenses').select('*').eq('store_id', storeId).eq('date', today),
      supabase.from('payouts').select('*').eq('store_id', storeId).eq('date', today),
      supabase.from('daily_ledger').select('*').eq('store_id', storeId).eq('date', today).single()
    ])
    
    const combined: Activity[] = [
      ...(sales ?? []).map(s => ({ type: 'sale' as const, data: s })),
      ...(expenses ?? []).map(e => ({ type: 'expense' as const, data: e })),
      ...(payouts ?? []).map(p => ({ type: 'payout' as const, data: p })),
    ]

    // If ledger exists for today, add it as a virtual activity or just use its stats
    const ledgerSale = ledger ? { type: 'sale' as const, data: { id: 'ledger-sale', amount: ledger.sale, category: 'Ledger Total', date: today, created_at: ledger.created_at, payment_method: 'mixed' } as any } : null
    const ledgerPayout = ledger && ledger.pay_out > 0 ? { type: 'payout' as const, data: { id: 'ledger-po', amount: ledger.pay_out, recipient_name: 'Ledger P.O', date: today, created_at: ledger.created_at, status: 'paid', method: 'cash' } as any } : null
    const ledgerBill = ledger && ledger.bills > 0 ? { type: 'expense' as const, data: { id: 'ledger-bill', amount: ledger.bills, category: 'Ledger Bill', date: today, created_at: ledger.created_at } as any } : null
    const ledgerPayroll = ledger && ledger.payroll > 0 ? { type: 'expense' as const, data: { id: 'ledger-payroll', amount: ledger.payroll, category: 'Ledger Payroll', date: today, created_at: ledger.created_at } as any } : null

    if (ledgerSale) combined.push(ledgerSale)
    if (ledgerPayout) combined.push(ledgerPayout)
    if (ledgerBill) combined.push(ledgerBill)
    if (ledgerPayroll) combined.push(ledgerPayroll)

    combined.sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())
    setActivities(combined)
    setLoading(false)
  }

  useEffect(() => { load() }, [storeId])

  async function handleDeleteStore() {
    const { error } = await supabase.from('stores').delete().eq('id', storeId)
    if (error) {
      alert('Error deleting store: ' + error.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const stats = {
    revenue: activities.filter(a => a.type === 'sale').reduce((s, a) => s + Number(a.data.amount), 0),
    expenses: activities.filter(a => a.type === 'expense').reduce((s, a) => s + Number(a.data.amount), 0),
    payouts: activities.filter(a => a.type === 'payout' && (a.data as Payout).status === 'paid').reduce((s, a) => s + Number(a.data.amount), 0),
  }
  const net = stats.revenue - stats.expenses - stats.payouts

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      {/* Minimal Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-3xl font-light text-slate-900 tracking-tight">Daily <span className="font-bold">Summary</span></h2>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Net</p>
            <p className={cn("text-2xl font-black tabular-nums", net >= 0 ? "text-slate-900" : "text-rose-600")}>
              {formatCurrency(net)}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Row - Ultra Thin */}
      <div className="grid grid-cols-3 gap-8 px-2">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Revenue</p>
          <p className="text-sm font-bold text-slate-900">{formatCurrency(stats.revenue)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Expenses</p>
          <p className="text-sm font-bold text-slate-900">{formatCurrency(stats.expenses)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payouts</p>
          <p className="text-sm font-bold text-slate-900">{formatCurrency(stats.payouts)}</p>
        </div>
      </div>

      {/* Action Strip */}
      <div className="flex gap-2">
        <Link href={`/dashboard/stores/${storeId}/ledger`} className="flex-1">
          <button className="w-full py-4 bg-slate-900 text-white rounded-xl text-sm font-bold uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98]">
             Open Daily Ledger
          </button>
        </Link>
      </div>

      {/* Activity - List Style */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6">Chronological Activity</h3>
        
        {activities.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl">
            <p className="text-xs font-medium text-slate-400">Your notebook is empty for today.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 border-t border-slate-50">
            {activities.map((activity, i) => (
              <div key={i} className="py-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    activity.type === 'sale' ? "bg-slate-50 text-slate-400 group-hover:bg-green-50 group-hover:text-green-600" :
                    activity.type === 'expense' ? "bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600" : 
                    "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                  )}>
                    {activity.type === 'sale' ? <ShoppingBagIcon size={14} /> :
                     activity.type === 'expense' ? <CreditCardIcon size={14} /> : <ArrowUpRightIcon size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {activity.type === 'sale' ? (activity.data as Sale).category :
                       activity.type === 'expense' ? (activity.data as Expense).category :
                       (activity.data as Payout).recipient_name}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                      {new Date(activity.data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
                      {activity.type === 'sale' ? (activity.data as Sale).payment_method :
                       activity.type === 'expense' ? (activity.data as Expense).vendor || 'Expense' :
                       (activity.data as Payout).method}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black tabular-nums",
                    activity.type === 'sale' ? "text-slate-900" : "text-slate-500"
                  )}>
                    {activity.type === 'sale' ? '+' : '-'}{formatCurrency(activity.data.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Navigation - Discrete */}
      <div className="pt-12 border-t border-slate-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-60 hover:opacity-100 transition-opacity mb-8">
          <Link href={`/dashboard/stores/${storeId}/sales`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Sales History</Link>
          <Link href={`/dashboard/stores/${storeId}/expenses`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Expenses</Link>
          <Link href={`/dashboard/stores/${storeId}/ledger`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Ledger</Link>
          <Link href={`/dashboard/stores/${storeId}/reports`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Reports</Link>
        </div>

        <div className="flex justify-center pt-4">
          <DeleteButton onConfirm={handleDeleteStore} label="Delete Store permanently" />
        </div>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
