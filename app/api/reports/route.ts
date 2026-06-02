import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const storeId = searchParams.get('store_id')
  const type    = searchParams.get('type') // sales, expenses, payouts
  const from    = searchParams.get('from')
  const to      = searchParams.get('to')

  if (!storeId || !type) {
    return NextResponse.json({ error: 'store_id and type required' }, { status: 400 })
  }

  const table = type === 'sales' ? 'sales' : type === 'expenses' ? 'expenses' : type === 'payouts' ? 'payouts' : null
  if (!table) return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })

  let query = supabase
    .from(table)
    .select('*')
    .eq('store_id', storeId)
    .order('date', { ascending: false })

  if (from) query = query.gte('date', from)
  if (to)   query = query.lte('date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json(data)
}
