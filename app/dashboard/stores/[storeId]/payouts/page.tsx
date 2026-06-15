'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, PageHeader, Button, Badge, EmptyState } from '@/components/ui'
import { DeleteButton } from '@/components/ui/DeleteButton'
import Link from 'next/link'
import { Payout } from '@/types'

export default function PayoutsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const supabase = createClient()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: store }, { data }] = await Promise.all([
      supabase.from('stores').select('name').eq('id', storeId).single(),
      supabase.from('payouts').select('*').eq('store_id', storeId).order('date', { ascending: false }),
    ])
    setStoreName(store?.name ?? '')
    setPayouts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [storeId])

  async function handleDelete(id: string) {
    await supabase.from('payouts').delete().eq('id', id)
    setPayouts(prev => prev.filter(p => p.id !== id))
  }

  const totalPaid    = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div>
      <PageHeader
        title={`${storeName} — Payouts Log`}
        description={`Paid: ${formatCurrency(totalPaid)} · Pending: ${formatCurrency(totalPending)}`}
      />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payouts.length === 0 ? (
        <EmptyState message="No payouts recorded yet."
          action={<Link href={`/dashboard/stores/${storeId}/ledger`}><Button>Go to Ledger</Button></Link>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Recipient</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Notes</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(payout => (
                  <tr key={payout.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(payout.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{payout.recipient_name}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{payout.method}</td>
                    <td className="px-4 py-3"><Badge label={payout.status} variant={payout.status === 'paid' ? 'green' : 'yellow'} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{payout.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(payout.amount)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-3">
                        <Link href={`/dashboard/stores/${storeId}/payouts/${payout.id}/edit`}
                          className="text-xs text-blue-500 hover:text-blue-700 transition-colors">Edit</Link>
                        <DeleteButton onConfirm={() => handleDelete(payout.id)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
