'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, PageHeader, Button, EmptyState } from '@/components/ui'
import { DeleteButton } from '@/components/ui/DeleteButton'
import Link from 'next/link'
import { Expense } from '@/types'

export default function ExpensesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: store }, { data }] = await Promise.all([
      supabase.from('stores').select('name').eq('id', storeId).single(),
      supabase.from('expenses').select('*').eq('store_id', storeId).order('date', { ascending: false }),
    ])
    setStoreName(store?.name ?? '')
    setExpenses(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [storeId])

  async function handleDelete(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div>
      <PageHeader
        title={`${storeName} — Expenses`}
        description={`${expenses.length} records · Total: ${formatCurrency(total)}`}
        action={<Link href={`/dashboard/stores/${storeId}/expenses/new`}><Button size="sm">+ Add expense</Button></Link>}
      />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState message="No expenses recorded yet."
          action={<Link href={`/dashboard/stores/${storeId}/expenses/new`}><Button>Add first expense</Button></Link>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Notes</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{expense.category}</td>
                    <td className="px-4 py-3 text-gray-500">{expense.vendor ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{expense.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-3">
                        <Link href={`/dashboard/stores/${storeId}/expenses/${expense.id}/edit`}
                          className="text-xs text-blue-500 hover:text-blue-700 transition-colors">Edit</Link>
                        <DeleteButton onConfirm={() => handleDelete(expense.id)} />
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
