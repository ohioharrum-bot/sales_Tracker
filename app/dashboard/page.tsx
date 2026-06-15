import { createClient } from '@/lib/supabase/server'
import { KPICard } from '@/components/dashboard/KPICard'
import { Card, EmptyState, Button } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Sale } from '@/types'
import Link from 'next/link'

interface RecentSale extends Sale {
  stores: { name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // Ensure user is logged in

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

  // Get date ranges
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const storeIds = stores.map(s => s.id)

  // Fetch aggregated data across all stores
  const [salesRes, expensesRes, payoutsRes, ledgerRes, yearlySalesRes, yearlyLedgerRes, recentSalesRes] = await Promise.all([
    // Monthly Sales
    supabase.from('sales').select('amount').in('store_id', storeIds).gte('date', monthStart).lte('date', today),
    // Monthly Expenses
    supabase.from('expenses').select('amount').in('store_id', storeIds).gte('date', monthStart).lte('date', today),
    // All Payouts (for pending/paid filtering)
    supabase.from('payouts').select('amount, status, date').in('store_id', storeIds),
    // Monthly Ledger
    supabase.from('daily_ledger').select('sale, pay_out, bills, payroll').in('store_id', storeIds).gte('date', monthStart).lte('date', today),
    
    // Yearly Sales
    supabase.from('sales').select('amount').in('store_id', storeIds).gte('date', yearStart).lte('date', today),
    // Yearly Ledger
    supabase.from('daily_ledger').select('sale').in('store_id', storeIds).gte('date', yearStart).lte('date', today),

    // Recent Sales
    supabase.from('sales').select('*, stores(name)').in('store_id', storeIds).order('created_at', { ascending: false }).limit(5),
  ])

  const ledgerRevenue = (ledgerRes.data ?? []).reduce((sum, l) => sum + Number(l.sale), 0)
  const ledgerExpenses = (ledgerRes.data ?? []).reduce((sum, l) => sum + Number(l.pay_out) + Number(l.bills) + Number(l.payroll), 0)

  const totalRevenue  = (salesRes.data ?? []).reduce((sum, s) => sum + Number(s.amount), 0) + ledgerRevenue
  const totalExpenses = (expensesRes.data ?? []).reduce((sum, e) => sum + Number(e.amount), 0) + ledgerExpenses
  
  const yearlyRevenue = (yearlySalesRes.data ?? []).reduce((sum, s) => sum + Number(s.amount), 0) + 
                       (yearlyLedgerRes.data ?? []).reduce((sum, l) => sum + Number(l.sale), 0)

  const payouts = payoutsRes.data ?? []
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0)
  const paidPayoutsThisMonth = payouts
    .filter(p => p.status === 'paid' && p.date >= monthStart && p.date <= today)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const netProfit = totalRevenue - totalExpenses - paidPayoutsThisMonth

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium">Overview across all your business locations</p>
        </div>
        <div className="flex gap-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
            {now.getFullYear()} Total: {formatCurrency(yearlyRevenue)}
          </div>
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
            {now.toLocaleString('default', { month: 'long' })}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 mb-10 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Revenue"    amount={totalRevenue}    color="blue"   subtitle="Total this month" />
        <KPICard title="Expenses"   amount={totalExpenses}   color="red"    subtitle="Total this month" />
        <KPICard title="Net Profit" amount={netProfit}       color="green"  subtitle="Estimated earnings" />
        <KPICard title="Pending"    amount={pendingPayouts}  color="yellow" subtitle="Unpaid payouts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stores list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Your Stores</h2>
            <Link href="/dashboard/stores/new">
              <Button size="sm" variant="secondary">+ New Store</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stores.map(store => (
              <Link key={store.id} href={`/dashboard/stores/${store.id}`}>
                <Card className="p-5 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col justify-between border-slate-200">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{store.name}</p>
                      <span className="text-slate-300 group-hover:text-indigo-300 transition-colors">&rarr;</span>
                    </div>
                    {store.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{store.description}</p>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-6">
                    Joined {formatDate(store.created_at)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent sales */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Sales</h2>
          <Card className="divide-y divide-slate-100 border-slate-200">
            {recentSalesRes.data && recentSalesRes.data.length > 0 ? (
              recentSalesRes.data.map((sale: RecentSale) => (
                <div key={sale.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-900">{sale.stores?.name}</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(sale.amount)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formatDate(sale.date)}</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{sale.category}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-400 font-medium">No recent sales</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}