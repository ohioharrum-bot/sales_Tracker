import { createClient } from '@/lib/supabase/server'
import { KPICard } from '@/components/dashboard/KPICard'
import { Card, EmptyState, Button, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { Sale } from '@/types'
import Link from 'next/link'

interface RecentSale extends Sale {
  stores: { name: string } | null
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const view = (params.view as string) || 'monthly'
  const month = parseInt((params.month as string) || (new Date().getMonth() + 1).toString())
  const year = parseInt((params.year as string) || new Date().getFullYear().toString())
  const from = (params.from as string) || ''
  const to = (params.to as string) || ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch all stores for this user
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  if (!stores || stores.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h1>
        <EmptyState
          message="You have no stores yet. Create one to start tracking sales."
          action={
            <Link
              href="/dashboard/stores/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create your first store
            </Link>
          }
        />
      </div>
    )
  }

  // Calculate date ranges
  let startDate: string
  let endDate: string
  let displayTitle: string

  if (view === 'monthly') {
    startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    endDate = new Date(year, month, 0).toISOString().split('T')[0]
    displayTitle = `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
  } else if (view === 'yearly') {
    startDate = new Date(year, 0, 1).toISOString().split('T')[0]
    endDate = new Date(year, 11, 31).toISOString().split('T')[0]
    displayTitle = `Year ${year}`
  } else {
    startDate = from || new Date().toISOString().split('T')[0]
    endDate = to || new Date().toISOString().split('T')[0]
    displayTitle = from && to ? `${formatDate(from)} - ${formatDate(to)}` : 'Custom Range'
  }

  const storeIds = stores.map(s => s.id)

  // Fetch aggregated data
  const [salesRes, expensesRes, payoutsRes, ledgerRes, recentSalesRes] = await Promise.all([
    // Sales in range
    supabase.from('sales').select('amount').in('store_id', storeIds).gte('date', startDate).lte('date', endDate),
    // Expenses in range
    supabase.from('expenses').select('amount').in('store_id', storeIds).gte('date', startDate).lte('date', endDate),
    // Payouts (all for pending, range for paid)
    supabase.from('payouts').select('amount, status, date').in('store_id', storeIds),
    // Ledger in range
    supabase.from('daily_ledger').select('sale, pay_out, bills, payroll').in('store_id', storeIds).gte('date', startDate).lte('date', endDate),
    // Recent Sales
    supabase.from('sales').select('*, stores(name)').in('store_id', storeIds).order('created_at', { ascending: false }).limit(5),
  ])

  const ledgerRevenue = (ledgerRes.data ?? []).reduce((sum, l) => sum + Number(l.sale), 0)
  const ledgerExpenses = (ledgerRes.data ?? []).reduce((sum, l) => sum + Number(l.pay_out) + Number(l.bills) + Number(l.payroll), 0)

  const totalRevenue  = (salesRes.data ?? []).reduce((sum, s) => sum + Number(s.amount), 0) + ledgerRevenue
  const totalExpenses = (expensesRes.data ?? []).reduce((sum, e) => sum + Number(e.amount), 0) + ledgerExpenses
  
  const payouts = payoutsRes.data ?? []
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0)
  const paidPayoutsInRange = payouts
    .filter(p => p.status === 'paid' && p.date >= startDate && p.date <= endDate)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const netProfit = totalRevenue - totalExpenses - paidPayoutsInRange

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-zen-text tracking-tight mb-1">Dashboard</h1>
          <p className="text-sm text-zen-muted font-medium italic">Welcome back to your business overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge label={displayTitle} variant="blue" />
        </div>
      </div>

      <DashboardFilters />

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-6 mb-10 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Revenue"    amount={totalRevenue}    color="blue"   subtitle={`Gross for ${displayTitle}`} />
        <KPICard title="Expenses"   amount={totalExpenses}   color="red"    subtitle={`Spent in ${displayTitle}`} />
        <KPICard title="Net Profit" amount={netProfit}       color="green"  subtitle="Available liquidity" />
        <KPICard title="Pending"    amount={pendingPayouts}  color="yellow" subtitle="Outstanding debt" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Stores list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-black text-zen-muted uppercase tracking-[0.25em]">Your Store Network</h2>
            <Link href="/dashboard/stores/new">
              <Button size="sm" className="bg-zen-accent text-white hover:bg-zen-accent/90 rounded-xl px-4 py-2 font-bold text-[10px] uppercase tracking-widest">
                + New Store
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {stores.map(store => (
              <Link key={store.id} href={`/dashboard/stores/${store.id}`}>
                <div className="p-6 bg-white border border-zen-border rounded-3xl zen-shadow hover:border-zen-accent/40 transition-all group flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-zen-accent-soft flex items-center justify-center text-zen-accent font-black text-lg">
                        {store.name.charAt(0)}
                      </div>
                      <span className="text-slate-300 group-hover:text-zen-accent transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                      </span>
                    </div>
                    <p className="font-black text-zen-text text-lg mb-2 group-hover:text-zen-accent transition-colors">{store.name}</p>
                    {store.description && (
                      <p className="text-xs text-zen-muted line-clamp-2 leading-relaxed font-medium">{store.description}</p>
                    )}
                  </div>
                  <div className="mt-8 pt-6 border-t border-zen-border flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      Added {formatDate(store.created_at)}
                    </p>
                    <Badge label="Operational" variant="green" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent sales */}
        <div>
          <h2 className="text-xs font-black text-zen-muted uppercase tracking-[0.25em] mb-6">Recent Activity</h2>
          <div className="bg-white border border-zen-border rounded-3xl zen-shadow divide-y divide-slate-50 overflow-hidden">
            {recentSalesRes.data && recentSalesRes.data.length > 0 ? (
              recentSalesRes.data.map((sale: RecentSale) => (
                <div key={sale.id} className="p-5 hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] font-black text-zen-muted uppercase tracking-widest mb-1">{sale.stores?.name}</p>
                      <p className="text-xs font-bold text-zen-text">{sale.category}</p>
                    </div>
                    <p className="text-sm font-black text-zen-text group-hover:text-zen-accent transition-colors">{formatCurrency(sale.amount)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">{formatDate(sale.date)}</p>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-zen-accent" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-xs text-zen-muted font-bold uppercase tracking-widest">No activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}