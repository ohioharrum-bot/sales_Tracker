'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, PageHeader, Button, Badge, EmptyState } from '@/components/ui'
import { DeleteButton } from '@/components/ui/DeleteButton'
import Link from 'next/link'
import { DistributorPurchase } from '@/types'

const DIST_LABELS: Record<string, string> = {
  budweiser: 'Budweiser', cdc: 'CDC', heidelberg: 'Heidelberg',
  glazers: 'Glazers', filichia: 'Filichia',
}

export default function DistributorsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const supabase = createClient()
  const [rows, setRows] = useState<DistributorPurchase[]>([])
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: store }, { data }] = await Promise.all([
      supabase.from('stores').select('name').eq('id', storeId).single(),
      supabase.from('distributor_purchases').select('*').eq('store_id', storeId).order('date', { ascending: false }),
    ])
    setStoreName(store?.name ?? '')
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [storeId])

  async function handleDelete(id: string) {
    await supabase.from('distributor_purchases').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const alcoholTotal = rows.filter(r => r.type === 'alcohol').reduce((s, r) => s + Number(r.amount), 0)
  const tobaccoTotal = rows.filter(r => r.type === 'tobacco').reduce((s, r) => s + Number(r.amount), 0)
  const alcoholTax   = alcoholTotal * 0.25
  const tobaccoTax   = tobaccoTotal * 0.08
  const totalTax     = alcoholTax + tobaccoTax

  const byDistributor = rows.reduce((acc, r) => {
    acc[r.distributor] = (acc[r.distributor] || 0) + Number(r.amount)
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <PageHeader
        title={`${storeName} — Distributors`}
        description="Beer and tobacco purchases with tax calculation"
        action={<Link href={`/dashboard/stores/${storeId}/distributors/new`}><Button size="sm">+ Add purchase</Button></Link>}
      />

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Alcohol Total</p>
          <p className="text-xl font-semibold text-blue-600">{formatCurrency(alcoholTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tobacco Total</p>
          <p className="text-xl font-semibold text-purple-600">{formatCurrency(tobaccoTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tax (Alcohol 25%)</p>
          <p className="text-xl font-semibold text-orange-600">{formatCurrency(alcoholTax)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tax (Tobacco 8%)</p>
          <p className="text-xl font-semibold text-orange-600">{formatCurrency(tobaccoTax)}</p>
        </Card>
      </div>

      <div className="bg-red-600 text-white rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">Total Tax Collected</p>
          <p className="text-xs opacity-60 mt-0.5">Alcohol Tax + Tobacco Tax</p>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(totalTax)}</p>
      </div>

      {Object.keys(byDistributor).length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-5">
          {Object.entries(byDistributor).map(([dist, total]) => (
            <Card key={dist} className="p-3 text-center">
              <p className="text-xs font-medium text-gray-500 mb-1">{DIST_LABELS[dist] ?? dist}</p>
              <p className="text-base font-semibold text-gray-900">{formatCurrency(total)}</p>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message="No distributor purchases yet."
          action={<Link href={`/dashboard/stores/${storeId}/distributors/new`}><Button>Add first purchase</Button></Link>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Distributor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Notes</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Tax</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const tax = row.type === 'alcohol' ? Number(row.amount) * 0.25 : Number(row.amount) * 0.08
                  return (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{DIST_LABELS[row.distributor] ?? row.distributor}</td>
                      <td className="px-4 py-3"><Badge label={row.type} variant={row.type === 'alcohol' ? 'blue' : 'gray'} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{row.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(Number(row.amount))}</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-medium whitespace-nowrap">{formatCurrency(tax)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-3">
                          <Link href={`/dashboard/stores/${storeId}/distributors/${row.id}/edit`}
                            className="text-xs text-blue-500 hover:text-blue-700 transition-colors">Edit</Link>
                          <DeleteButton onConfirm={() => handleDelete(row.id)} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-600">Total</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">{formatCurrency(alcoholTotal + tobaccoTotal)}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">{formatCurrency(totalTax)}</td>
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
