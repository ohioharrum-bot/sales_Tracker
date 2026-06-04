'use client'

import { useState, useEffect, use } from 'react'
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

export default function EditExpensePage({ params }: { params: Promise<{ storeId: string; id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = use(params)

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
    if (!result.success) { setError(result.error.issues[0].message); return }
    setLoading(true)
    const { error: updateError } = await supabase.from('expenses').update({
      vendor: result.data.vendor || null, category: result.data.category,
      amount: result.data.amount, receipt_url: result.data.receipt_url || null,
      date: result.data.date, notes: result.data.notes || null,
    }).eq('id', id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push(`/dashboard/stores/${storeId}/expenses`)
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
