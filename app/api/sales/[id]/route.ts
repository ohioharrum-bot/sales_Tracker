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
  try {
    const { syncDailyLedger } = await import('@/lib/ledger-sync')
    await syncDailyLedger(sale.store_id, sale.date)
  } catch (syncError) {
    console.error('Failed to sync ledger after sale deletion:', syncError)
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
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
  try {
    const { syncDailyLedger } = await import('@/lib/ledger-sync')
    await syncDailyLedger(currentSale.store_id, currentSale.date)
    if (body.date && body.date !== currentSale.date) {
      await syncDailyLedger(currentSale.store_id, body.date)
    }
  } catch (syncError) {
    console.error('Failed to sync ledger after sale update:', syncError)
  }

  return NextResponse.json(data)
}
