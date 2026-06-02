'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { expenseSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card, PageHeader } from '@/components/ui'

const CATEGORIES = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'rent',      label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'salary',    label: 'Salary' },
  { value: 'other',     label: 'Other' },
]

export default function NewExpensePage({ params }: { params: Promise<{ storeId: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId } = React.use(params)

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    amount: '',
    category: 'inventory',
    vendor: '',
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

    const result = expenseSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase.from('expenses').insert({
      store_id: storeId,
      date: result.data.date,
      amount: result.data.amount,
      category: result.data.category,
      vendor: result.data.vendor || null,
      notes: result.data.notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/stores/${storeId}/expenses`)
    router.refresh()
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Add Expense</h1>
        <p className="text-sm text-slate-500 font-medium">Record costs and overheads for this location</p>
      </div>

      <Card className="p-8 border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Expense Date"
              type="date"
              required
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
            <Input
              label="Total Cost (USD)"
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
              label="Cost Category"
              options={CATEGORIES}
              value={form.category}
              onChange={e => set('category', e.target.value)}
            />
            <Input
              label="Vendor / Payee"
              value={form.vendor}
              onChange={e => set('vendor', e.target.value)}
              placeholder="e.g. Utility Co, Landlord"
            />
          </div>

          <Textarea
            label="Additional Details"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Invoice numbers or specific details..."
          />

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" disabled={loading} size="lg" className="flex-1">
              {loading ? 'Logging Cost...' : 'Record Expense'}
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
