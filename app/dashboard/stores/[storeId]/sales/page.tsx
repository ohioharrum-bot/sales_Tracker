import { createClient } from '@/lib/supabase/server'
import { Card, Button, PageHeader, EmptyState, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Sale } from '@/types'

export default async function StoreSalesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params
  const supabase = await createClient()

  const { data: sales, error } = await supabase
    .from('sales')
    .select('*')
    .eq('store_id', storeId)
    .order('date', { ascending: false })

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-bold">
        Error loading sales: {error.message}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Sales Log"
        description="Daily transaction history and entry"
        action={
          <Link href={`/dashboard/stores/${storeId}/sales/new`}>
            <Button size="md">+ New Sale</Button>
          </Link>
        }
      />

      {sales && sales.length > 0 ? (
        <Card className="border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map((sale: Sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium">{formatDate(sale.date)}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 capitalize">{sale.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        label={sale.payment_method} 
                        variant={sale.payment_method === 'cash' ? 'green' : sale.payment_method === 'card' ? 'blue' : 'gray'} 
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-slate-900">{formatCurrency(sale.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          message="Your sales log is currently empty. Start by recording your first sale."
          action={
            <Link href={`/dashboard/stores/${storeId}/sales/new`}>
              <Button size="lg">Record First Sale</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
