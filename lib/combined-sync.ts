import { createAdminClient } from '@/lib/supabase/admin'

export async function syncCombinedLedger(supabase: any, date: string, userId: string) {
  console.log(`[Sync] Starting combined ledger sync for date: ${date}, user: ${userId}`)
  
  // Use admin client for upserts to bypass RLS if necessary
  const adminSupabase = createAdminClient()

  try {
    // 1. Get all stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', userId)

    if (storesError) {
      console.error('[Sync] Error fetching stores:', storesError)
      throw storesError
    }
    
    if (!stores || stores.length === 0) {
      console.log('[Sync] No stores found for user')
      return null
    }

    // 2. Fetch sales, payouts, and expenses for all stores on this date
    const storeIds = stores.map((s: any) => s.id)
    
    const [salesRes, payoutsRes, expensesRes] = await Promise.all([
      supabase.from('sales').select('store_id, amount').in('store_id', storeIds).eq('date', date),
      supabase.from('payouts').select('store_id, amount').in('store_id', storeIds).eq('date', date).eq('status', 'paid'),
      supabase.from('expenses').select('store_id, amount, category').in('store_id', storeIds).eq('date', date)
    ])

    if (salesRes.error) { console.error('[Sync] Sales error:', salesRes.error); throw salesRes.error }
    if (payoutsRes.error) { console.error('[Sync] Payouts error:', payoutsRes.error); throw payoutsRes.error }
    if (expensesRes.error) { console.error('[Sync] Expenses error:', expensesRes.error); throw expensesRes.error }

    const sales = salesRes.data || []
    const payouts = payoutsRes.data || []
    const expenses = expensesRes.data || []

    // 3. Aggregate totals
    const totalSales = sales.reduce((sum: number, s: any) => sum + Number(s.amount), 0)
    const totalPayouts = payouts.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    const totalBills = expenses.filter((e: any) => e.category !== 'payroll').reduce((sum: number, e: any) => sum + Number(e.amount), 0)
    const totalPayroll = expenses.filter((e: any) => e.category === 'payroll').reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    console.log(`[Sync] Totals - Sales: ${totalSales}, PO: ${totalPayouts}, Bills: ${totalBills}, Payroll: ${totalPayroll}`)

    // 4. Find or create the "Daily Combined Ledger" store
    let { data: combinedStore } = await supabase
      .from('stores')
      .select('id')
      .eq('name', 'Daily Combined Ledger')
      .eq('owner_id', userId)
      .single()

    if (!combinedStore) {
      console.log('[Sync] Creating Daily Combined Ledger store')
      const { data: newStore, error: createError } = await adminSupabase
        .from('stores')
        .insert({
          name: 'Daily Combined Ledger',
          description: 'Aggregated totals across all registers',
          owner_id: userId
        })
        .select()
        .single()

      if (createError) {
        console.error('[Sync] Error creating combined store:', createError)
        throw createError
      }
      combinedStore = newStore
    }

    const storeId = combinedStore!.id

    // 5. Upsert to ledger_entries for the combined store
    const [year, month, day] = date.split('-').map(Number)

    const storeBreakdown = stores
      .filter((s: any) => s.name !== 'Daily Combined Ledger')
      .map((store: any) => ({
        name: store.name,
        amount: sales.filter((s: any) => s.store_id === store.id).reduce((sum: number, s: any) => sum + Number(s.amount), 0)
      }))

    const entryData = {
      sale: totalSales,
      po: totalPayouts,
      bill: totalBills,
      pr: totalPayroll,
      cc: 0,
      storeId,
      syncedAt: new Date().toISOString(),
      isCombined: true,
      breakdown: storeBreakdown
    }

    console.log('[Sync] Upserting to ledger_entries')
    const { error: ledgerError } = await adminSupabase
      .from('ledger_entries')
      .upsert({
        user_id: userId,
        year,
        month,
        day,
        type: 'sale',
        data: entryData
      }, { onConflict: 'user_id, year, month, day, type' })

    if (ledgerError) {
      console.error('[Sync] Error upserting ledger_entry:', ledgerError)
      throw ledgerError
    }

    // 6. Upsert to daily_ledger
    const ds = totalSales - (totalPayouts + totalBills + totalPayroll)
    
    console.log('[Sync] Upserting to daily_ledger')
    const { error: dailyLedgerError } = await adminSupabase
      .from('daily_ledger')
      .upsert({
        store_id: storeId,
        date: date,
        sale: totalSales,
        pay_out: totalPayouts,
        bills: totalBills,
        payroll: totalPayroll,
        day_savings: ds,
        notes: `Daily Combined Sales - ${date}`
      }, { onConflict: 'store_id, date' })

    if (dailyLedgerError) {
      console.error('[Sync] Error upserting daily_ledger:', dailyLedgerError)
      throw dailyLedgerError
    }

    console.log('[Sync] Synchronization successful')
    return {
      totalSales,
      totalPayouts,
      totalBills,
      totalPayroll,
      daySavings: ds,
      breakdown: storeBreakdown,
      date
    }
  } catch (err) {
    console.error('[Sync] Unexpected error during sync:', err)
    throw err
  }
}
