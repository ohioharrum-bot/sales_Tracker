import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { posProductSchema } from '@/lib/validations'

async function verifyStore(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string) {
  const { data: store, error } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .single()
  return !error && !!store
}

function rowToProduct(row: Record<string, unknown>) {
  return {
    barcode: row.barcode,
    name: row.name,
    price: Number(row.price),
    cost: Number(row.cost),
    stock: Number(row.stock),
    cat: row.cat,
    quick: row.quick,
    taxable: row.taxable,
    reorder: Number(row.reorder),
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const storeId = request.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  if (!(await verifyStore(supabase, storeId))) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('pos_products')
    .select('*')
    .eq('store_id', storeId)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data || []).map(rowToProduct))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Bulk seed: { store_id, products: [...] }
  if (Array.isArray(body.products)) {
    const storeId = body.store_id
    if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })
    if (!(await verifyStore(supabase, storeId))) {
      return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
    }

    const rows = body.products.map((p: Record<string, unknown>) => ({
      store_id: storeId,
      barcode: p.barcode,
      name: p.name,
      price: p.price,
      cost: p.cost ?? 0,
      stock: p.stock ?? 0,
      cat: p.cat ?? 'Other',
      quick: p.quick ?? false,
      taxable: p.taxable ?? true,
      reorder: p.reorder ?? 0,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('pos_products').upsert(rows, { onConflict: 'store_id,barcode' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: rows.length })
  }

  const result = posProductSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  if (!(await verifyStore(supabase, result.data.store_id))) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const { store_id, ...product } = result.data
  const { data, error } = await supabase
    .from('pos_products')
    .upsert({ store_id, ...product, updated_at: new Date().toISOString() }, { onConflict: 'store_id,barcode' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(rowToProduct(data), { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const storeId = request.nextUrl.searchParams.get('store_id')
  const barcode = request.nextUrl.searchParams.get('barcode')
  if (!storeId || !barcode) {
    return NextResponse.json({ error: 'store_id and barcode required' }, { status: 400 })
  }

  if (!(await verifyStore(supabase, storeId))) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const { error } = await supabase
    .from('pos_products')
    .delete()
    .eq('store_id', storeId)
    .eq('barcode', barcode)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
