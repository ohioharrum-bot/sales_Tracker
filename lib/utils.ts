export function formatCurrency(amount: number | string | undefined | null): string {
  const val = Number(amount || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(isNaN(val) ? 0 : val)
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function cn(...inputs: (string | undefined | null | boolean | { [key: string]: unknown })[]) {
  return inputs
    .filter(Boolean)
    .map(input => {
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ')
      }
      return input
    })
    .join(' ')
}

export function exportToCSV(data: any[], filename: string): void {
  if (!data.length) return

  // Filter out internal Supabase fields and ID fields for readability
  const excludedKeys = ['id', 'store_id', 'created_at', 'owner_id', 'receipt_url']
  const allHeaders = Object.keys(data[0])
  const headers = allHeaders.filter(h => !excludedKeys.includes(h))

  const rows = data.map(row =>
    headers.map(h => {
      let val = row[h]

      // Format dates and numbers for humans
      if (h === 'date' && typeof val === 'string') {
        val = new Date(val).toLocaleDateString()
      }
      if (h === 'amount' && typeof val === 'number') {
        val = val.toFixed(2)
      }

      // Handle strings with commas or newlines
      const stringVal = String(val ?? '')
      if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('"')) {
        return `"${stringVal.replace(/"/g, '""')}"`
      }
      return stringVal
    }).join(',')
  )

  // Add UTF-8 BOM for Excel compatibility
  const csv = '\uFEFF' + [headers.map(h => h.toUpperCase().replace('_', ' ')).join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}


export function getDateRange(range: 'today' | 'week' | 'month'): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split('T')[0]

  if (range === 'today') {
    return { from: to, to }
  }

  if (range === 'week') {
    const from = new Date(now)
    from.setDate(now.getDate() - 7)
    return { from: from.toISOString().split('T')[0], to }
  }

  // month
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: from.toISOString().split('T')[0], to }
}