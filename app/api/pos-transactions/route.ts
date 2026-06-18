import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { posTransactionSchema } from '@/lib/validations'

async function verifyStore(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string) {
  const { data: store, error } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .single()
  return !error && !!store
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const storeId = request.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  if (!(await verifyStore(supabase, storeId))) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const since = request.nextUrl.searchParams.get('since')

  let query = supabase
    .from('pos_transactions')
    .select('id, ts, type, data')
    .eq('store_id', storeId)
    .order('ts', { ascending: false })

  if (since) query = query.gte('ts', Number(since))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const transactions = (data || []).map((row) => ({
    id: row.id,
    ts: row.ts,
    type: row.type,
    ...(row.data as Record<string, unknown>),
  }))

  return NextResponse.json(transactions)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = posTransactionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { store_id, id, ts, type, data } = result.data
  if (!(await verifyStore(supabase, store_id))) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const { data: row, error } = await supabase
    .from('pos_transactions')
    .upsert({ id, store_id, ts, type, data }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(row, { status: 201 })
}
