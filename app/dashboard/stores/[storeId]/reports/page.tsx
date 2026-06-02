'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exportToCSV, formatCurrency } from '@/lib/utils'
import { Sale, Payout, Expense } from '@/types'
import { Button, Card, Select, Input } from '@/components/ui'

type ReportType = 'sales' | 'payouts' | 'expenses'
type ReportData = Sale | Payout | Expense

export default function ReportsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = React.use(params)
  const supabase = createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [type, setType] = useState<ReportType>('sales')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{ count: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchAndExport() {
    setLoading(true)
    setError(null)
    setSummary(null)

    let data: ReportData[] = []
    let total = 0

    if (type === 'sales') {
      const { data: rows, error: err } = await supabase
        .from('sales')
        .select('*')
        .eq('store_id', storeId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })

      if (err) { setError(err.message); setLoading(false); return }
      data = (rows as Sale[]) ?? []
      total = data.reduce((sum, r) => sum + Number(r.amount), 0)
    }

    if (type === 'payouts') {
      const { data: rows, error: err } = await supabase
        .from('payouts')
        .select('*')
        .eq('store_id', storeId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })

      if (err) { setError(err.message); setLoading(false); return }
      data = (rows as Payout[]) ?? []
      total = data.reduce((sum, r) => sum + Number(r.amount), 0)
    }

    if (type === 'expenses') {
      const { data: rows, error: err } = await supabase
        .from('expenses')
        .select('*')
        .eq('store_id', storeId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })

      if (err) { setError(err.message); setLoading(false); return }
      data = (rows as Expense[]) ?? []
      total = data.reduce((sum, r) => sum + Number(r.amount), 0)
    }

    setSummary({ count: data.length, total })

    if (data.length > 0) {
      exportToCSV(data as unknown as Record<string, unknown>[], `${type}-${from}-to-${to}`)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reports & Export</h1>
        <p className="text-sm text-slate-500 font-medium">Generate professional CSV reports for your accounting</p>
      </div>

      <Card className="p-8 border-slate-200">
        <div className="space-y-6">
          <Select
            label="What data do you need?"
            value={type}
            onChange={e => setType(e.target.value as ReportType)}
            options={[
              { value: 'sales',    label: 'Sales Report' },
              { value: 'payouts',  label: 'Payouts Log' },
              { value: 'expenses', label: 'Expense Tracking' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600">
              {error}
            </div>
          )}

          {summary && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col items-center gap-1">
              {summary.count === 0 ? (
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No data found in this range</p>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Export Successful</p>
                  <p className="text-sm font-bold text-indigo-900">
                    {summary.count} records · {formatCurrency(summary.total)}
                  </p>
                </>
              )}
            </div>
          )}

          <Button onClick={fetchAndExport} disabled={loading} size="lg" className="w-full h-12">
            {loading ? 'Generating Report...' : 'Download CSV Report'}
          </Button>
          
          <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
            Formatted for Excel & Google Sheets
          </p>
        </div>
      </Card>
    </div>
  )
}
