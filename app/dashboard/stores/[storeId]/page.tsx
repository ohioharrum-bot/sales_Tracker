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

  const [syncing, setSyncing] = useState(false)
  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/ledger/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, date: today })
      })
      if (res.ok) {
        alert('Ledger synchronized successfully!')
        router.refresh()
        load()
      } else {
        const data = await res.json()
        alert('Error syncing ledger: ' + data.error)
      }
    } catch (err) {
      alert('Failed to sync ledger.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 pb-20">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 border-b border-slate-100 pb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-zen-text tracking-tight mb-2">Daily Summary</h1>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 border border-zen-border rounded-3xl zen-shadow flex flex-col items-start md:items-end">
          <p className="text-[9px] font-black text-zen-muted uppercase tracking-[0.25em] mb-2">Net Balance</p>
          <p className={cn("text-2xl sm:text-3xl font-black tabular-nums tracking-tighter", net >= 0 ? "text-zen-accent" : "text-rose-600")}>
            {formatCurrency(net)}
          </p>
        </div>
      </section>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          { label: 'Revenue', val: stats.revenue, color: 'text-emerald-600' },
          { label: 'Expenses', val: stats.expenses, color: 'text-rose-600' },
          { label: 'Payouts', val: stats.payouts, color: 'text-zen-accent' },
        ].map(stat => (
          <div key={stat.label} className="p-6 bg-white border border-zen-border rounded-2xl zen-shadow group hover:border-zen-accent/30 transition-all">
            <p className="text-[9px] font-black text-zen-muted uppercase tracking-[0.2em] mb-3">{stat.label}</p>
            <p className={cn("text-xl font-black tabular-nums tracking-tight", stat.color)}>{formatCurrency(stat.val)}</p>
          </div>
        ))}
      </div>

      {/* Action Strip */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href={`/dashboard/stores/${storeId}/ledger`} className="flex-1">
          <button className="w-full py-6 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 active:scale-[0.99]">
             Access Daily Ledger
          </button>
        </Link>
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="flex-1 py-6 bg-white border border-zen-border text-zen-text rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-50 transition-all zen-shadow active:scale-[0.99] disabled:opacity-50"
        >
          {syncing ? 'Synchronizing...' : 'Close Day & Sync Ledger'}
        </button>
      </div>

      {/* Activity - List Style */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pl-2">Chronological Feed</h3>

        {activities.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Feed empty for today</p>
          </div>
        ) : (
          <div className="bg-white border border-zen-border rounded-[2.5rem] zen-shadow overflow-hidden divide-y divide-slate-50">
            {activities.map((activity, i) => (
              <div key={i} className="p-6 flex items-center justify-between group hover:bg-slate-50/50 transition-all">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border border-transparent",
                    activity.type === 'sale' ? "bg-emerald-50 text-emerald-500 group-hover:border-emerald-100" :
                    activity.type === 'expense' ? "bg-rose-50 text-rose-500 group-hover:border-rose-100" : 
                    "bg-emerald-50 text-zen-accent group-hover:border-emerald-100"
                  )}>
                    <div className="w-2 h-2 rounded-full bg-current" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zen-text mb-1">
                      {activity.type === 'sale' ? (activity.data as Sale).category :
                       activity.type === 'expense' ? (activity.data as Expense).category :
                       (activity.data as Payout).recipient_name}
                    </p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                      {new Date(activity.data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
                      {activity.type === 'sale' ? (activity.data as Sale).payment_method :
                       activity.type === 'expense' ? (activity.data as Expense).vendor || 'Operating Cost' :
                       (activity.data as Payout).method}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-black tabular-nums tracking-tighter",
                    activity.type === 'sale' ? "text-zen-text" : "text-rose-500"
                  )}>
                    {activity.type === 'sale' ? '+' : '-'}{formatCurrency(activity.data.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-16 border-t border-slate-100 space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
          {[
            { label: 'Sales History', href: 'sales' },
            { label: 'Expenses', href: 'expenses' },
            { label: 'Ledger', href: 'ledger' },
            { label: 'Reports', href: 'reports' },
          ].map(link => (
            <Link key={link.href} href={`/dashboard/stores/${storeId}/${link.href}`} className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] hover:text-zen-accent transition-colors">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex justify-center">
          <DeleteButton onConfirm={handleDeleteStore} label="Terminate Store Identity" />
        </div>
      </div>
    </div>
  )
  }

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
