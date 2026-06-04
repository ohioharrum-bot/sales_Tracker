'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { dailyLedgerSchema } from '@/lib/validations'
import { Input, Textarea, Button, Card, PageHeader, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

export default function EditLedgerPage({ params }: { params: Promise<{ storeId: string; id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const { storeId, id } = use(params)

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
    if (!result.success) { setError(result.error.issues[0].message); return }
    setLoading(true)
    const { error: updateError } = await supabase.from('daily_ledger').update({
      date: result.data.date, sale: result.data.sale, pay_out: result.data.pay_out,
      bills: result.data.bills, payroll: result.data.payroll,
      day_savings: result.data.day_savings, total_savings: result.data.total_savings,
      notes: result.data.notes || null,
    }).eq('id', id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push(`/dashboard/stores/${storeId}/ledger`)
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
        <div className={`border rounded-lg p-3 text-center ${net >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`text-xs font-medium mb-1 ${net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net</p>
          <p className={`text-lg font-semibold ${net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatCurrency(net)}</p>
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
