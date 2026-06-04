'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, PageHeader, Button, Badge, EmptyState } from '@/components/ui'
import { DeleteButton } from '@/components/ui/DeleteButton'
import Link from 'next/link'
import { Sale } from '@/types'

const methodColors: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  cash: 'green', card: 'blue', transfer: 'yellow', other: 'gray',
}

export default function SalesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const supabase = createClient()
  const [sales, setSales] = useState<Sale[]>([])
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: store }, { data }] = await Promise.all([
      supabase.from('stores').select('name').eq('id', storeId).single(),
      supabase.from('sales').select('*').eq('store_id', storeId).order('date', { ascending: false }),
    ])
    setStoreName(store?.name ?? '')
    setSales(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [storeId])

  async function handleDelete(id: string) {
    await supabase.from('sales').delete().eq('id', id)
    setSales(prev => prev.filter(s => s.id !== id))
  }

  const total = sales.reduce((sum, s) => sum + Number(s.amount), 0)

  return (
    <div>
      <PageHeader
        title={`${storeName} — Sales`}
        description={`${sales.length} records · Total: ${formatCurrency(total)}`}
        action={<Link href={`/dashboard/stores/${storeId}/sales/new`}><Button size="sm">+ Add sale</Button></Link>}
      />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sales.length === 0 ? (
        <EmptyState message="No sales recorded yet."
          action={<Link href={`/dashboard/stores/${storeId}/sales/new`}><Button>Add first sale</Button></Link>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Notes</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(sale.date)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{sale.category}</td>
                    <td className="px-4 py-3"><Badge label={sale.payment_method} variant={methodColors[sale.payment_method] ?? 'gray'} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{sale.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(sale.amount)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-3">
                        <Link href={`/dashboard/stores/${storeId}/sales/${sale.id}/edit`}
                          className="text-xs text-blue-500 hover:text-blue-700 transition-colors">Edit</Link>
                        <DeleteButton onConfirm={() => handleDelete(sale.id)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-xs font-medium text-gray-500">Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
