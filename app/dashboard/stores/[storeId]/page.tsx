'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, Button, Badge, EmptyState } from '@/components/ui'
import Link from 'next/link'
import { Sale, Expense, Payout } from '@/types'
import { ShoppingBagIcon, CreditCardIcon, ArrowUpRightIcon, HistoryIcon, BookOpenIcon } from 'lucide-react'

type Activity = 
  | { type: 'sale';    data: Sale }
  | { type: 'expense'; data: Expense }
  | { type: 'payout';  data: Payout }

export default function StoreOverviewPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [storeName, setStoreName] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [isSticky, setIsSticky] = useState(false)
  
  // Current date for filtering
  const today = new Date().toISOString().split('T')[0]

  async function load() {
    setLoading(true)
    const [
      { data: store },
      { data: sales },
      { data: expenses },
      { data: payouts }
    ] = await Promise.all([
      supabase.from('stores').select('name').eq('id', storeId).single(),
      supabase.from('sales').select('*').eq('store_id', storeId).eq('date', today),
      supabase.from('expenses').select('*').eq('store_id', storeId).eq('date', today),
      supabase.from('payouts').select('*').eq('store_id', storeId).eq('date', today),
    ])

    setStoreName(store?.name ?? '')
    
    const combined: Activity[] = [
      ...(sales ?? []).map(s => ({ type: 'sale' as const, data: s })),
      ...(expenses ?? []).map(e => ({ type: 'expense' as const, data: e })),
      ...(payouts ?? []).map(p => ({ type: 'payout' as const, data: p })),
    ]

    // Sort by created_at descending
    combined.sort((a, b) => 
      new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
    )

    setActivities(combined)
    setLoading(false)
  }

  useEffect(() => { load() }, [storeId])

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 150)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const totalRevenue  = activities.filter(a => a.type === 'sale').reduce((s, a) => s + Number(a.data.amount), 0)
  const totalExpenses = activities.filter(a => a.type === 'expense').reduce((s, a) => s + Number(a.data.amount), 0)
  const totalPayouts  = activities.filter(a => a.type === 'payout' && (a.data as Payout).status === 'paid').reduce((s, a) => s + Number(a.data.amount), 0)
  const netProfit     = totalRevenue - totalExpenses - totalPayouts

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Sticky Top Bar for Balance */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200 p-4 transition-all transform duration-300 md:left-56",
        isSticky ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Daily Balance</p>
            <p className="text-xl font-black italic tracking-tighter text-slate-900">{formatCurrency(netProfit)}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/stores/${storeId}/sales/new`}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-full h-10 w-10 p-0">
                <ShoppingBagIcon size={18} />
              </Button>
            </Link>
            <Link href={`/dashboard/stores/${storeId}/expenses/new`}>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white rounded-full h-10 w-10 p-0">
                <CreditCardIcon size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Daily Summary Card */}
      <Card className="bg-slate-900 text-white p-6 border-none shadow-2xl overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Today's Balance</p>
              <h2 className="text-4xl font-black italic tracking-tighter">
                {formatCurrency(netProfit)}
              </h2>
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wider">{formatDate(today)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Revenue</p>
              <p className="text-sm font-bold text-green-400">+{formatCurrency(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Expenses</p>
              <p className="text-sm font-bold text-rose-400">-{formatCurrency(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payouts</p>
              <p className="text-sm font-bold text-blue-400">-{formatCurrency(totalPayouts)}</p>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Quick Add</h3>
        <div className="grid grid-cols-3 gap-3">
          <Link href={`/dashboard/stores/${storeId}/sales/new`}>
            <button className="w-full aspect-square bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-green-500 hover:bg-green-50 transition-all group">
              <div className="p-3 bg-green-100 rounded-xl text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <ShoppingBagIcon size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600">Sale</span>
            </button>
          </Link>
          <Link href={`/dashboard/stores/${storeId}/expenses/new`}>
            <button className="w-full aspect-square bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-rose-500 hover:bg-rose-50 transition-all group">
              <div className="p-3 bg-rose-100 rounded-xl text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <CreditCardIcon size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600">Expense</span>
            </button>
          </Link>
          <Link href={`/dashboard/stores/${storeId}/payouts/new`}>
            <button className="w-full aspect-square bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ArrowUpRightIcon size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600">Payout</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Today's Activity */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Activity</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">
            {activities.length} Records
          </span>
        </div>
        
        {activities.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-sm font-medium text-slate-400">No activity recorded today.</p>
            <p className="text-xs text-slate-300 mt-1">Start by adding a sale or expense above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, i) => (
              <div key={i} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    activity.type === 'sale' ? "bg-green-50 text-green-600" :
                    activity.type === 'expense' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {activity.type === 'sale' ? <ShoppingBagIcon size={18} /> :
                     activity.type === 'expense' ? <CreditCardIcon size={18} /> : <ArrowUpRightIcon size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {activity.type === 'sale' ? (activity.data as Sale).category :
                       activity.type === 'expense' ? (activity.data as Expense).category :
                       (activity.data as Payout).recipient_name}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      {activity.type === 'sale' ? (activity.data as Sale).payment_method :
                       activity.type === 'expense' ? (activity.data as Expense).vendor || 'Expense' :
                       (activity.data as Payout).method}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black",
                    activity.type === 'sale' ? "text-green-600" : "text-slate-900"
                  )}>
                    {activity.type === 'sale' ? '+' : '-'}{formatCurrency(activity.data.amount)}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
                    {new Date(activity.data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Footer for deep dives */}
      <div className="pt-8 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Manage Records</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/dashboard/stores/${storeId}/sales`} className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-2xl transition-all shadow-sm">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><HistoryIcon size={16} /></div>
            Sales History
          </Link>
          <Link href={`/dashboard/stores/${storeId}/expenses`} className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-2xl transition-all shadow-sm">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><CreditCardIcon size={16} /></div>
            Expenses
          </Link>
          <Link href={`/dashboard/stores/${storeId}/ledger`} className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-2xl transition-all shadow-sm">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><BookOpenIcon size={16} /></div>
            Digital Ledger
          </Link>
          <Link href={`/dashboard/stores/${storeId}/reports`} className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-2xl transition-all shadow-sm">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><ArrowUpRightIcon size={16} /></div>
            Export Reports
          </Link>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
