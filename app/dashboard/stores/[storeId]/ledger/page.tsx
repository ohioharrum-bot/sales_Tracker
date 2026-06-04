'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, PageHeader, Button, EmptyState } from '@/components/ui'
import Link from 'next/link'
import { DailyLedger } from '@/types'

type ViewMode = 'daily' | 'weekly' | 'monthly'

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

function sumGroup(rows: DailyLedger[]) {
  return {
    sale:          rows.reduce((s, r) => s + Number(r.sale), 0),
    pay_out:       rows.reduce((s, r) => s + Number(r.pay_out), 0),
    bills:         rows.reduce((s, r) => s + Number(r.bills), 0),
    payroll:       rows.reduce((s, r) => s + Number(r.payroll), 0),
    day_savings:   rows.reduce((s, r) => s + Number(r.day_savings), 0),
    total_savings: rows.reduce((s, r) => s + Number(r.total_savings), 0),
  }
}

const COL = ['Sale', 'Pay Out', 'Bills', 'Payroll', 'Day Savings', 'Total Savings']
const KEYS = ['sale', 'pay_out', 'bills', 'payroll', 'day_savings', 'total_savings'] as const

export default function LedgerPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const supabase = createClient()

  const [view, setView] = useState<ViewMode>('daily')
  const [rows, setRows] = useState<DailyLedger[]>([])
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: store }, { data: ledger }] = await Promise.all([
        supabase.from('stores').select('name').eq('id', storeId).single(),
        supabase.from('daily_ledger').select('*').eq('store_id', storeId).order('date', { ascending: false }),
      ])
      setStoreName(store?.name ?? '')
      setRows(ledger ?? [])
      setLoading(false)
    }
    load()
  }, [storeId])

  // ── Totals row ──
  const totals = sumGroup(rows)

  // ── Group data based on view ──
  const grouped = view === 'weekly'
    ? groupBy(rows, r => getWeekKey(r.date))
    : view === 'monthly'
    ? groupBy(rows, r => getMonthKey(r.date))
    : null

  function renderLabel(key: string): string {
    if (view === 'monthly') {
      const [y, m] = key.split('-')
      return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    }
    if (view === 'weekly') {
      const end = new Date(key + 'T00:00:00')
      end.setDate(end.getDate() + 6)
      return `Week of ${formatDate(key)} – ${formatDate(end.toISOString().split('T')[0])}`
    }
    return key
  }

  return (
    <div>
      <PageHeader
        title={`${storeName} — Ledger`}
        description="Daily sales, payouts, bills, payroll and savings"
        action={
          <Link href={`/dashboard/stores/${storeId}/ledger/new`}>
            <Button size="sm">+ Add entry</Button>
          </Link>
        }
      />

      {/* View toggle */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['daily', 'weekly', 'monthly'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          message="No ledger entries yet."
          action={<Link href={`/dashboard/stores/${storeId}/ledger/new`}><Button>Add first entry</Button></Link>}
        />
      ) : (
        <>
          {/* ── DAILY VIEW ── */}
          {view === 'daily' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Date</th>
                      {COL.map(c => (
                        <th key={c} className="text-right px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{c}</th>
                      ))}
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(row.date)}</td>
                        {KEYS.map(k => (
                          <td key={k} className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                            {Number(row[k]) > 0 ? formatCurrency(Number(row[k])) : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link 
                            href={`/dashboard/stores/${storeId}/ledger/${row.id}/edit`}
                            className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t border-blue-100">
                      <td className="px-4 py-3 text-xs font-semibold text-blue-700">Total</td>
                      {KEYS.map(k => (
                        <td key={k} className="px-4 py-3 text-right text-xs font-semibold text-blue-700 whitespace-nowrap">
                          {formatCurrency(totals[k])}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* ── WEEKLY / MONTHLY VIEW ── */}
          {(view === 'weekly' || view === 'monthly') && grouped && (
            <div className="space-y-4">
              {Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([key, groupRows]) => {
                  const sums = sumGroup(groupRows)
                  return (
                    <Card key={key}>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-800">{renderLabel(key)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{groupRows.length} entries</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-50">
                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Date</th>
                              {COL.map(c => (
                                <th key={c} className="text-right px-4 py-2 text-xs font-medium text-gray-400 whitespace-nowrap">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {groupRows.map(row => (
                              <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(row.date)}</td>
                                {KEYS.map(k => (
                                  <td key={k} className="px-4 py-2.5 text-right text-gray-800 whitespace-nowrap">
                                    {Number(row[k]) > 0 ? formatCurrency(Number(row[k])) : <span className="text-gray-300">—</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-blue-50 border-t border-blue-100">
                              <td className="px-4 py-2.5 text-xs font-semibold text-blue-700">Subtotal</td>
                              {KEYS.map(k => (
                                <td key={k} className="px-4 py-2.5 text-right text-xs font-semibold text-blue-700 whitespace-nowrap">
                                  {formatCurrency(sums[k])}
                                </td>
                              ))}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </Card>
                  )
                })}

              {/* Grand total */}
              <Card className="border-blue-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="bg-blue-600">
                        <td className="px-4 py-3 text-xs font-bold text-white whitespace-nowrap">
                          Grand Total ({view === 'weekly' ? 'All Weeks' : 'All Months'})
                        </td>
                        {KEYS.map(k => (
                          <td key={k} className="px-4 py-3 text-right text-xs font-bold text-white whitespace-nowrap">
                            {formatCurrency(totals[k])}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
