import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { payoutSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const storeId = searchParams.get('store_id')
  const from    = searchParams.get('from')
  const to      = searchParams.get('to')

  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  let query = supabase
    .from('payouts')
    .select('*')
    .eq('store_id', storeId)
    .order('date', { ascending: false })

  if (from) query = query.gte('date', from)
  if (to)   query = query.lte('date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = payoutSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  // Verify store ownership
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('id', result.data.store_id)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('payouts')
    .insert(result.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger automatic ledger sync
  try {
    const { syncDailyLedger } = await import('@/lib/ledger-sync')
    await syncDailyLedger(result.data.store_id, result.data.date)
  } catch (syncError) {
    console.error('Failed to sync ledger after payout:', syncError)
  }

  return NextResponse.json(data, { status: 201 })
}
