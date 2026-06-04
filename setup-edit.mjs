import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { dirname } from 'path'

const files = {}

// ─── SHARED DELETE BUTTON COMPONENT ──────────────────────────────────────────
files['components/ui/DeleteButton.tsx'] = `'use client'

import { useState } from 'react'

interface DeleteButtonProps {
  onConfirm: () => Promise<void>
  label?: string
}

export function DeleteButton({ onConfirm, label = 'Delete' }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    setConfirming(false)
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700 transition-colors"
    >
      {label}
    </button>
  )
}
`

// ─── SALES LIST PAGE (updated with edit/delete) ───────────────────────────────
files['app/dashboard/stores/[storeId]/sales/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, PageHeader, Button, Badge, EmptyState } from '@/components/ui'
import { DeleteButton } from '@/components/ui/DeleteButton'
import Link from 'next/link'
import { Sale } from '@/types'

const methodColors: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  cash: 'green', card: 'blue', transfer: 'yellow', other: 'gray',
}

export default function SalesPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params
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
        title={\`\${storeName} — Sales\`}
        description={\`\${sales.length} records · Total: \${formatCurrency(total)}\`}
        action={<Link href={\`/dashboard/stores/\${storeId}/sales/new\`}><Button size="sm">+ Add sale</Button></Link>}
      />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sales.length === 0 ? (
        <EmptyState message="No sales recorded yet."
          action={<Link href={\`/dashboard/stores/\${storeId}/sales/new\`}><Button>Add first sale</Button></Link>}
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
                        <Link href={\`/dashboard/stores/\${storeId}/sales/\${sale.id}/edit\`}
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
`

// ─── SALES EDIT PAGE ──────────────────────────────────────────────────────────
files['app/dashboard/stores/[storeId]/sales/[id]/edit/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saleSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card, PageHeader, Spinner } from '@/components/ui'

const CATEGORIES = [
  { value: 'general', label: 'General' }, { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' }, { value: 'online', label: 'Online' },
  { value: 'service', label: 'Service' }, { value: 'other', label: 'Other' },
]
const METHODS = [
  { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Transfer' }, { value: 'other', label: 'Other' },
]

export default function EditSalePage({ params }: { params: { storeId: string; id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = params

  const [form, setForm] = useState({ date: '', amount: '', category: 'general', payment_method: 'cash', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sales').select('*').eq('id', id).single()
      if (data) setForm({ date: data.date, amount: String(data.amount), category: data.category, payment_method: data.payment_method, notes: data.notes ?? '' })
      setFetching(false)
    }
    load()
  }, [id])

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = saleSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) { setError(result.error.errors[0].message); return }
    setLoading(true)
    const { error: updateError } = await supabase.from('sales').update({
      date: result.data.date, amount: result.data.amount, category: result.data.category,
      payment_method: result.data.payment_method, notes: result.data.notes || null,
    }).eq('id', id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push(\`/dashboard/stores/\${storeId}/sales\`)
    router.refresh()
  }

  if (fetching) return <Spinner />

  return (
    <div className="max-w-lg">
      <PageHeader title="Edit sale" description="Update this sale entry" />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Date" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Amount (USD)" type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
          <Select label="Category" options={CATEGORIES} value={form.category} onChange={e => set('category', e.target.value)} />
          <Select label="Payment method" options={METHODS} value={form.payment_method} onChange={e => set('payment_method', e.target.value)} />
          <Textarea label="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
`

// ─── PAYOUTS LIST PAGE (updated with edit/delete) ─────────────────────────────
files['app/dashboard/stores/[storeId]/payouts/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, PageHeader, Button, Badge, EmptyState } from '@/components/ui'
import { DeleteButton } from '@/components/ui/DeleteButton'
import Link from 'next/link'
import { Payout } from '@/types'

export default function PayoutsPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params
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
        title={\`\${storeName} — Payouts\`}
        description={\`Paid: \${formatCurrency(totalPaid)} · Pending: \${formatCurrency(totalPending)}\`}
        action={<Link href={\`/dashboard/stores/\${storeId}/payouts/new\`}><Button size="sm">+ Add payout</Button></Link>}
      />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payouts.length === 0 ? (
        <EmptyState message="No payouts recorded yet."
          action={<Link href={\`/dashboard/stores/\${storeId}/payouts/new\`}><Button>Add first payout</Button></Link>}
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
                        <Link href={\`/dashboard/stores/\${storeId}/payouts/\${payout.id}/edit\`}
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
`

// ─── PAYOUTS EDIT PAGE ────────────────────────────────────────────────────────
files['app/dashboard/stores/[storeId]/payouts/[id]/edit/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { payoutSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card, PageHeader, Spinner } from '@/components/ui'

const METHODS  = [{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'transfer', label: 'Transfer' }, { value: 'other', label: 'Other' }]
const STATUSES = [{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }]

export default function EditPayoutPage({ params }: { params: { storeId: string; id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = params

  const [form, setForm] = useState({ recipient_name: '', amount: '', method: 'cash', date: '', status: 'pending', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('payouts').select('*').eq('id', id).single()
      if (data) setForm({ recipient_name: data.recipient_name, amount: String(data.amount), method: data.method, date: data.date, status: data.status, notes: data.notes ?? '' })
      setFetching(false)
    }
    load()
  }, [id])

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = payoutSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) { setError(result.error.errors[0].message); return }
    setLoading(true)
    const { error: updateError } = await supabase.from('payouts').update({
      recipient_name: result.data.recipient_name, amount: result.data.amount,
      method: result.data.method, date: result.data.date, status: result.data.status,
      notes: result.data.notes || null,
    }).eq('id', id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push(\`/dashboard/stores/\${storeId}/payouts\`)
    router.refresh()
  }

  if (fetching) return <Spinner />

  return (
    <div className="max-w-lg">
      <PageHeader title="Edit payout" description="Update this payout entry" />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Recipient name" required value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} />
          <Input label="Amount (USD)" type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} />
          <Input label="Date" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          <Select label="Payment method" options={METHODS} value={form.method} onChange={e => set('method', e.target.value)} />
          <Select label="Status" options={STATUSES} value={form.status} onChange={e => set('status', e.target.value)} />
          <Textarea label="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
`

// ─── EXPENSES LIST PAGE (updated with edit/delete) ────────────────────────────
files['app/dashboard/stores/[storeId]/expenses/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, PageHeader, Button, EmptyState } from '@/components/ui'
import { DeleteButton } from '@/components/ui/DeleteButton'
import Link from 'next/link'
import { Expense } from '@/types'

export default function ExpensesPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params
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
        title={\`\${storeName} — Expenses\`}
        description={\`\${expenses.length} records · Total: \${formatCurrency(total)}\`}
        action={<Link href={\`/dashboard/stores/\${storeId}/expenses/new\`}><Button size="sm">+ Add expense</Button></Link>}
      />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState message="No expenses recorded yet."
          action={<Link href={\`/dashboard/stores/\${storeId}/expenses/new\`}><Button>Add first expense</Button></Link>}
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
                        <Link href={\`/dashboard/stores/\${storeId}/expenses/\${expense.id}/edit\`}
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
`

// ─── EXPENSES EDIT PAGE ───────────────────────────────────────────────────────
files['app/dashboard/stores/[storeId]/expenses/[id]/edit/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { expenseSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card, PageHeader, Spinner } from '@/components/ui'

const CATEGORIES = [
  { value: 'general', label: 'General' }, { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' }, { value: 'supplies', label: 'Supplies' },
  { value: 'marketing', label: 'Marketing' }, { value: 'shipping', label: 'Shipping' },
  { value: 'salary', label: 'Salary' }, { value: 'other', label: 'Other' },
]

export default function EditExpensePage({ params }: { params: { storeId: string; id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = params

  const [form, setForm] = useState({ vendor: '', category: 'general', amount: '', receipt_url: '', date: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('expenses').select('*').eq('id', id).single()
      if (data) setForm({ vendor: data.vendor ?? '', category: data.category, amount: String(data.amount), receipt_url: data.receipt_url ?? '', date: data.date, notes: data.notes ?? '' })
      setFetching(false)
    }
    load()
  }, [id])

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = expenseSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) { setError(result.error.errors[0].message); return }
    setLoading(true)
    const { error: updateError } = await supabase.from('expenses').update({
      vendor: result.data.vendor || null, category: result.data.category,
      amount: result.data.amount, receipt_url: result.data.receipt_url || null,
      date: result.data.date, notes: result.data.notes || null,
    }).eq('id', id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push(\`/dashboard/stores/\${storeId}/expenses\`)
    router.refresh()
  }

  if (fetching) return <Spinner />

  return (
    <div className="max-w-lg">
      <PageHeader title="Edit expense" description="Update this expense entry" />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Category" options={CATEGORIES} value={form.category} onChange={e => set('category', e.target.value)} />
          <Input label="Amount (USD)" type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} />
          <Input label="Date" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Vendor (optional)" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
          <Input label="Receipt URL (optional)" type="url" value={form.receipt_url} onChange={e => set('receipt_url', e.target.value)} />
          <Textarea label="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
`

// ─── LEDGER EDIT PAGE ─────────────────────────────────────────────────────────
files['app/dashboard/stores/[storeId]/ledger/[id]/edit/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { dailyLedgerSchema } from '@/lib/validations'
import { Input, Textarea, Button, Card, PageHeader, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

export default function EditLedgerPage({ params }: { params: { storeId: string; id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = params

  const [form, setForm] = useState({ date: '', sale: '', pay_out: '', bills: '', payroll: '', day_savings: '', total_savings: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('daily_ledger').select('*').eq('id', id).single()
      if (data) setForm({
        date: data.date, sale: String(data.sale), pay_out: String(data.pay_out),
        bills: String(data.bills), payroll: String(data.payroll),
        day_savings: String(data.day_savings), total_savings: String(data.total_savings),
        notes: data.notes ?? '',
      })
      setFetching(false)
    }
    load()
  }, [id])

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }

  const sale    = Number(form.sale) || 0
  const pay_out = Number(form.pay_out) || 0
  const bills   = Number(form.bills) || 0
  const payroll = Number(form.payroll) || 0
  const net     = sale - pay_out - bills - payroll

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = dailyLedgerSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) { setError(result.error.errors[0].message); return }
    setLoading(true)
    const { error: updateError } = await supabase.from('daily_ledger').update({
      date: result.data.date, sale: result.data.sale, pay_out: result.data.pay_out,
      bills: result.data.bills, payroll: result.data.payroll,
      day_savings: result.data.day_savings, total_savings: result.data.total_savings,
      notes: result.data.notes || null,
    }).eq('id', id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push(\`/dashboard/stores/\${storeId}/ledger\`)
    router.refresh()
  }

  if (fetching) return <Spinner />

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit ledger entry" description="Update this daily entry" />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-xs text-green-600 font-medium mb-1">Sale</p>
          <p className="text-lg font-semibold text-green-700">{formatCurrency(sale)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-xs text-red-600 font-medium mb-1">Total Out</p>
          <p className="text-lg font-semibold text-red-700">{formatCurrency(pay_out + bills + payroll)}</p>
        </div>
        <div className={\`border rounded-lg p-3 text-center \${net >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}\`}>
          <p className={\`text-xs font-medium mb-1 \${net >= 0 ? 'text-blue-600' : 'text-orange-600'}\`}>Net</p>
          <p className={\`text-lg font-semibold \${net >= 0 ? 'text-blue-700' : 'text-orange-700'}\`}>{formatCurrency(net)}</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Date" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sale ($)" type="number" step="0.01" min="0" value={form.sale} onChange={e => set('sale', e.target.value)} placeholder="0.00" />
            <Input label="Pay Out ($)" type="number" step="0.01" min="0" value={form.pay_out} onChange={e => set('pay_out', e.target.value)} placeholder="0.00" />
            <Input label="Bills ($)" type="number" step="0.01" min="0" value={form.bills} onChange={e => set('bills', e.target.value)} placeholder="0.00" />
            <Input label="Payroll ($)" type="number" step="0.01" min="0" value={form.payroll} onChange={e => set('payroll', e.target.value)} placeholder="0.00" />
            <Input label="Day Savings ($)" type="number" step="0.01" min="0" value={form.day_savings} onChange={e => set('day_savings', e.target.value)} placeholder="0.00" />
            <Input label="Total Savings ($)" type="number" step="0.01" min="0" value={form.total_savings} onChange={e => set('total_savings', e.target.value)} placeholder="0.00" />
          </div>
          <Textarea label="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
`

// ─── DISTRIBUTORS LIST PAGE (updated with edit/delete) ────────────────────────
files['app/dashboard/stores/[storeId]/distributors/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
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

export default function DistributorsPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params
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
        title={\`\${storeName} — Distributors\`}
        description="Beer and tobacco purchases with tax calculation"
        action={<Link href={\`/dashboard/stores/\${storeId}/distributors/new\`}><Button size="sm">+ Add purchase</Button></Link>}
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
          action={<Link href={\`/dashboard/stores/\${storeId}/distributors/new\`}><Button>Add first purchase</Button></Link>}
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
                          <Link href={\`/dashboard/stores/\${storeId}/distributors/\${row.id}/edit\`}
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
`

// ─── DISTRIBUTORS EDIT PAGE ───────────────────────────────────────────────────
files['app/dashboard/stores/[storeId]/distributors/[id]/edit/page.tsx'] = `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { distributorPurchaseSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card, PageHeader, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

const DISTRIBUTORS = [
  { value: 'budweiser', label: 'Budweiser' },
  { value: 'cdc', label: 'CDC (Columbus Distributing)' },
  { value: 'heidelberg', label: 'Heidelberg' },
  { value: 'glazers', label: 'Glazers' },
  { value: 'filichia', label: 'Filichia (Cigarettes)' },
]
const TYPES = [
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'tobacco', label: 'Tobacco' },
]

export default function EditDistributorPage({ params }: { params: { storeId: string; id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = params

  const [form, setForm] = useState({ date: '', distributor: 'budweiser', type: 'alcohol', amount: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('distributor_purchases').select('*').eq('id', id).single()
      if (data) setForm({ date: data.date, distributor: data.distributor, type: data.type, amount: String(data.amount), notes: data.notes ?? '' })
      setFetching(false)
    }
    load()
  }, [id])

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }

  const amount  = Number(form.amount) || 0
  const taxRate = form.type === 'alcohol' ? 0.25 : 0.08
  const tax     = amount * taxRate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = distributorPurchaseSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) { setError(result.error.errors[0].message); return }
    setLoading(true)
    const { error: updateError } = await supabase.from('distributor_purchases').update({
      date: result.data.date, distributor: result.data.distributor, type: result.data.type,
      amount: result.data.amount, notes: result.data.notes || null,
    }).eq('id', id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push(\`/dashboard/stores/\${storeId}/distributors\`)
    router.refresh()
  }

  if (fetching) return <Spinner />

  return (
    <div className="max-w-lg">
      <PageHeader title="Edit purchase" description="Update this distributor purchase" />

      {amount > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">Amount</p>
            <p className="text-xl font-semibold text-blue-700">{formatCurrency(amount)}</p>
          </div>
          <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600 font-medium mb-1">Tax ({form.type === 'alcohol' ? '25%' : '8%'})</p>
            <p className="text-xl font-semibold text-orange-700">{formatCurrency(tax)}</p>
          </div>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Date" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          <Select label="Distributor" options={DISTRIBUTORS} value={form.distributor} onChange={e => set('distributor', e.target.value)} />
          <Select label="Type" options={TYPES} value={form.type} onChange={e => set('type', e.target.value)} />
          <Input label="Amount ($)" type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} />
          <Textarea label="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
`

// ─── Write all files ──────────────────────────────────────────────────────────
let created = 0
let skipped = 0

for (const [filePath, content] of Object.entries(files)) {
  const dir = dirname(filePath)
  mkdirSync(dir, { recursive: true })
  if (!existsSync(filePath)) {
    writeFileSync(filePath, content, 'utf8')
    console.log(`✓ created: ${filePath}`)
    created++
  } else {
    writeFileSync(filePath, content, 'utf8')
    console.log(`↺ updated: ${filePath}`)
    created++
  }
}

console.log(`\nDone — ${created} files written`)
