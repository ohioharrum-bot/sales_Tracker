'use client'

import { useState, useEffect, use } from 'react'
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

export default function EditSalePage({ params }: { params: Promise<{ storeId: string; id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = use(params)

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
    router.push(`/dashboard/stores/${storeId}/sales`)
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
