'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, Input } from '@/components/ui'
import { useState, useEffect } from 'react'

const months = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const years = [
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
]

const views = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Range' },
]

export function DashboardFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentView = searchParams.get('view') || 'monthly'
  const currentMonth = searchParams.get('month') || (new Date().getMonth() + 1).toString()
  const currentYear = searchParams.get('year') || new Date().getFullYear().toString()
  const currentFrom = searchParams.get('from') || ''
  const currentTo = searchParams.get('to') || ''

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]: any) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="w-full sm:w-auto">
        <Select
          label="View"
          options={views}
          value={currentView}
          onChange={(e: any) => updateFilters({ view: e.target.value })}
        />
      </div>

      {currentView === 'monthly' && (
        <>
          <div className="w-full sm:w-auto">
            <Select
              label="Month"
              options={months}
              value={currentMonth}
              onChange={(e: any) => updateFilters({ month: e.target.value })}
            />
          </div>
          <div className="w-full sm:w-auto">
            <Select
              label="Year"
              options={years}
              value={currentYear}
              onChange={(e: any) => updateFilters({ year: e.target.value })}
            />
          </div>
        </>
      )}

      {currentView === 'yearly' && (
        <div className="w-full sm:w-auto">
          <Select
            label="Year"
            options={years}
            value={currentYear}
            onChange={(e: any) => updateFilters({ year: e.target.value })}
          />
        </div>
      )}

      {currentView === 'custom' && (
        <>
          <div className="w-full sm:w-auto">
            <Input
              label="From"
              type="date"
              value={currentFrom}
              onChange={(e: any) => updateFilters({ from: e.target.value })}
            />
          </div>
          <div className="w-full sm:w-auto">
            <Input
              label="To"
              type="date"
              value={currentTo}
              onChange={(e: any) => updateFilters({ to: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
  )
}
