import { createClient } from '@/lib/supabase/server'

export async function syncDailyLedger(storeId: string, date: string) {
  const supabase = await createClient()

  // 1. Calculate total sales for the date
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('amount')
    .eq('store_id', storeId)
    .eq('date', date)

  if (salesError) throw salesError

  const totalSales = sales?.reduce((sum, s) => sum + Number(s.amount), 0) || 0

  // 2. Calculate total payouts for the date
  const { data: payouts, error: payoutsError } = await supabase
    .from('payouts')
    .select('amount')
    .eq('store_id', storeId)
    .eq('date', date)
    .eq('status', 'paid')

  if (payoutsError) throw payoutsError
  const totalPayouts = payouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

  // 3. Calculate total expenses (bills/payroll) for the date
  // For simplicity, we'll treat all expenses as 'bills' for now, 
  // or we could try to categorize them if the schema supports it.
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('store_id', storeId)
    .eq('date', date)

  if (expensesError) throw expensesError
  const totalBills = expenses?.filter(e => e.category !== 'payroll').reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const totalPayroll = expenses?.filter(e => e.category === 'payroll').reduce((sum, e) => sum + Number(e.amount), 0) || 0

  // 4. Get existing ledger entry to preserve other fields
  const dateObj = new Date(date)
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existingEntry } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .eq('day', day)
    .eq('type', 'sale')
    .single()

  const existingData = existingEntry?.data || {}
  
  const entryData = {
    ...existingData,
    sale: totalSales,
    po: totalPayouts || (existingData.po || 0),
    bill: totalBills || (existingData.bill || 0),
    pr: totalPayroll || (existingData.pr || 0),
    cc: existingData.cc || 0,
    storeId,
    syncedAt: new Date().toISOString()
  }

  // 5. Upsert to ledger_entries
  const { error: ledgerError } = await supabase
    .from('ledger_entries')
    .upsert({
      user_id: user.id,
      year,
      month,
      day,
      type: 'sale',
      data: entryData
    }, { onConflict: 'user_id, year, month, day, type' })

  if (ledgerError) throw ledgerError

  // 6. Upsert to daily_ledger
  const ds = totalSales - (entryData.po + entryData.bill + entryData.pr)
  
  const { error: dailyLedgerError } = await supabase
    .from('daily_ledger')
    .upsert({
      store_id: storeId,
      date: date,
      sale: totalSales,
      pay_out: entryData.po,
      bills: entryData.bill,
      payroll: entryData.pr,
      day_savings: ds,
      notes: `Synced automatically at ${new Date().toLocaleTimeString()}`
    }, { onConflict: 'store_id, date' })

  if (dailyLedgerError) throw dailyLedgerError

  return { totalSales, totalPayouts, totalBills, totalPayroll, daySavings: ds }
}
