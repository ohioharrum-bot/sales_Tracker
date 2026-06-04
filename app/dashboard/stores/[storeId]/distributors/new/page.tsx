'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { distributorPurchaseSchema } from '@/lib/validations'
import { Input, Select, Textarea, Button, Card, PageHeader } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

const DISTRIBUTORS = [
  { value: 'budweiser',  label: 'Budweiser' },
  { value: 'cdc',        label: 'CDC (Columbus Distributing)' },
  { value: 'heidelberg', label: 'Heidelberg' },
  { value: 'glazers',    label: 'Glazers' },
  { value: 'filichia',   label: 'Filichia (Cigarettes)' },
]
const TYPES = [
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'tobacco', label: 'Tobacco' },
]

export default function NewDistributorPage({ params }: { params: Promise<{ storeId: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId } = use(params)
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    distributor: 'budweiser',
    type: 'alcohol',
    amount: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Auto-set type based on distributor
  function handleDistributorChange(value: string) {
    setForm(prev => ({
      ...prev,
      distributor: value,
      type: value === 'filichia' ? 'tobacco' : 'alcohol',
    }))
  }

  const amount   = Number(form.amount) || 0
  const taxRate  = form.type === 'alcohol' ? 0.25 : 0.08
  const taxLabel = form.type === 'alcohol' ? '25%' : '8%'
  const tax      = amount * taxRate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = distributorPurchaseSchema.safeParse({ ...form, store_id: storeId })
    if (!result.success) { setError(result.error.issues[0].message); return }
    setLoading(true)
    const { error: insertError } = await supabase.from('distributor_purchases').insert({
      store_id:    storeId,
      date:        result.data.date,
      distributor: result.data.distributor,
      type:        result.data.type,
      amount:      result.data.amount,
      notes:       result.data.notes || null,
    })
    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push(`/dashboard/stores/${storeId}/distributors`)
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Add distributor purchase" description="Record a beer or tobacco purchase" />

      {/* Live tax preview */}
      {amount > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">Purchase Amount</p>
            <p className="text-xl font-semibold text-blue-700">{formatCurrency(amount)}</p>
          </div>
          <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600 font-medium mb-1">Tax ({taxLabel})</p>
            <p className="text-xl font-semibold text-orange-700">{formatCurrency(tax)}</p>
          </div>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Date" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          <Select
            label="Distributor"
            options={DISTRIBUTORS}
            value={form.distributor}
            onChange={e => handleDistributorChange(e.target.value)}
          />
          <Select
            label="Type"
            options={TYPES}
            value={form.type}
            onChange={e => set('type', e.target.value)}
          />
          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            placeholder="0.00"
          />
          <Textarea label="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Invoice #, delivery notes..." />

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save purchase'}</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
