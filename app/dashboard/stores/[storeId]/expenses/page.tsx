import { createClient } from '@/lib/supabase/server'
import { Card, Button, PageHeader, EmptyState } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Expense } from '@/types'

export default async function StoreExpensesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params
  const supabase = await createClient()

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('store_id', storeId)
    .order('date', { ascending: false })

  if (error) {
    return <div>Error loading expenses: {error.message}</div>
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track and manage store expenses"
        action={
          <Link href={`/dashboard/stores/${storeId}/expenses/new`}>
            <Button>+ Add expense</Button>
          </Link>
        }
      />

      {expenses && expenses.length > 0 ? (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense: Expense) => (
                <tr key={expense.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{formatDate(expense.date)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium capitalize">{expense.category}</td>
                  <td className="px-4 py-3 text-gray-500">{expense.vendor || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          message="No expenses recorded yet for this store."
          action={
            <Link href={`/dashboard/stores/${storeId}/expenses/new`}>
              <Button>Add your first expense</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
