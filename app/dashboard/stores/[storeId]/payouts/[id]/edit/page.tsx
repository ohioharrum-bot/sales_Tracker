'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { payoutSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card, PageHeader, Spinner } from '@/components/ui'

const METHODS  = [{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'transfer', label: 'Transfer' }, { value: 'other', label: 'Other' }]
const STATUSES = [{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }]

export default function EditPayoutPage({ params }: { params: Promise<{ storeId: string; id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = use(params)

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
    if (!result.success) { setError(result.error.issues[0].message); return }
    setLoading(true)
    const { error: updateError } = await supabase.from('payouts').update({
      recipient_name: result.data.recipient_name, amount: result.data.amount,
      method: result.data.method, date: result.data.date, status: result.data.status,
      notes: result.data.notes || null,
    }).eq('id', id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push(`/dashboard/stores/${storeId}/payouts`)
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
