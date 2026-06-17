import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { saleSchema } from '@/lib/validations'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Get sale date and store_id before deleting for sync
  const { data: sale } = await supabase
    .from('sales')
    .select('store_id, date')
    .eq('id', id)
    .single()

  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })

  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger sync
  console.log(`[Sales] Sale deleted successfully, triggering sync for date: ${sale.date}`)
  try {
    const { syncCombinedLedger } = await import('@/lib/combined-sync')
    await syncCombinedLedger(supabase, sale.date, (await supabase.auth.getUser()).data.user!.id)
    console.log('[Sales] Combined ledger sync completed')
  } catch (syncError) {
    console.error('[Sales] Failed to sync combined ledger after sale deletion:', syncError)
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const body = await request.json()

  // Get current sale data for sync before update
  const { data: currentSale } = await supabase
    .from('sales')
    .select('store_id, date')
    .eq('id', id)
    .single()

  if (!currentSale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('sales')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger sync for both old and new dates (in case date was changed)
  console.log(`[Sales] Sale updated successfully, triggering sync for date: ${currentSale.date}`)
  try {
    const { syncCombinedLedger } = await import('@/lib/combined-sync')
    await syncCombinedLedger(supabase, currentSale.date, user.id)
    if (body.date && body.date !== currentSale.date) {
      console.log(`[Sales] Date changed to ${body.date}, triggering second sync`)
      await syncCombinedLedger(supabase, body.date, user.id)
    }
    console.log('[Sales] Combined ledger sync completed')
  } catch (syncError) {
    console.error('[Sales] Failed to sync combined ledger after sale update:', syncError)
  }

  return NextResponse.json(data)
}
