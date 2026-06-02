import { createClient } from '@/lib/supabase/server'
import { Card, Button, PageHeader, EmptyState } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Payout } from '@/types'
import { cn } from '@/lib/utils'

export default async function StorePayoutsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params
  const supabase = await createClient()

  const { data: payouts, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('store_id', storeId)
    .order('date', { ascending: false })

  if (error) {
    return <div>Error loading payouts: {error.message}</div>
  }

  return (
    <div>
      <PageHeader
        title="Payout Management"
        description="Track distributions and owner equity payments"
        action={
          <Link href={`/dashboard/stores/${storeId}/payouts/new`}>
            <Button size="md">Record Payout</Button>
          </Link>
        }
      />

      {payouts && payouts.length > 0 ? (
        <Card className="border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipient</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payouts.map((payout: Payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium">{formatDate(payout.date)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{payout.recipient_name}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                        payout.status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      )}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-slate-900">{formatCurrency(payout.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          message="No payouts have been recorded for this store yet."
          action={
            <Link href={`/dashboard/stores/${storeId}/payouts/new`}>
              <Button size="lg">Record First Payout</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
