'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { payoutSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card, PageHeader } from '@/components/ui'

const METHODS = [
  { value: 'cash',     label: 'Cash' },
  { value: 'card',     label: 'Card' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other',    label: 'Other' },
]

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid',    label: 'Paid' },
]

export default function NewPayoutPage({ params }: { params: Promise<{ storeId: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId } = React.use(params)

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    amount: '',
    recipient_name: '',
    method: 'transfer',
    status: 'pending',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = payoutSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase.from('payouts').insert({
      store_id: storeId,
      date: result.data.date,
      amount: result.data.amount,
      recipient_name: result.data.recipient_name,
      method: result.data.method,
      status: result.data.status,
      notes: result.data.notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/stores/${storeId}/payouts`)
    router.refresh()
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Record Payout</h1>
        <p className="text-sm text-slate-500 font-medium">Distribute earnings to store owners or partners</p>
      </div>

      <Card className="p-8 border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Payout Date"
              type="date"
              required
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
            <Input
              label="Amount (USD)"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <Input
            label="Recipient Name"
            required
            value={form.recipient_name}
            onChange={e => set('recipient_name', e.target.value)}
            placeholder="e.g. John Doe"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              label="Transfer Method"
              options={METHODS}
              value={form.method}
              onChange={e => set('method', e.target.value)}
            />
            <Select
              label="Current Status"
              options={STATUSES}
              value={form.status}
              onChange={e => set('status', e.target.value)}
            />
          </div>

          <Textarea
            label="Additional Notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Reference numbers, bank details, etc."
          />

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" disabled={loading} size="lg" className="flex-1">
              {loading ? 'Processing...' : 'Confirm Payout'}
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
