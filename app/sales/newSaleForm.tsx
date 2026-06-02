'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saleSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card } from '@/components/ui'

const CATEGORIES = [
  { value: 'general',    label: 'General' },
  { value: 'retail',     label: 'Retail' },
  { value: 'wholesale',  label: 'Wholesale' },
  { value: 'online',     label: 'Online' },
  { value: 'service',    label: 'Service' },
  { value: 'other',      label: 'Other' },
]

const METHODS = [
  { value: 'cash',     label: 'Cash' },
  { value: 'card',     label: 'Card' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other',    label: 'Other' },
]

export default function NewSaleForm({ params }: { params: { storeId: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId } = params

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    amount: '',
    category: 'general',
    payment_method: 'cash',
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

    const result = saleSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase.from('sales').insert({
      store_id: storeId,
      date: result.data.date,
      amount: result.data.amount,
      category: result.data.category,
      payment_method: result.data.payment_method,
      notes: result.data.notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/stores/${storeId}/sales`)
    router.refresh()
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Record Sale</h1>
        <p className="text-sm text-slate-500 font-medium">Log a new transaction for your store</p>
      </div>

      <Card className="p-8 border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Date of Sale"
              type="date"
              required
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
            <Input
              label="Total Amount (USD)"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              label="Category"
              options={CATEGORIES}
              value={form.category}
              onChange={e => set('category', e.target.value)}
            />
            <Select
              label="Payment Method"
              options={METHODS}
              value={form.payment_method}
              onChange={e => set('payment_method', e.target.value)}
            />
          </div>

          <Textarea
            label="Additional Notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="e.g. Customer name, specific items sold..."
          />

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
              <span className="w-5 h-5 bg-rose-200 text-rose-700 rounded-full flex items-center justify-center">!</span>
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" disabled={loading} size="lg" className="flex-1">
              {loading ? 'Processing...' : 'Confirm & Save Sale'}
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
