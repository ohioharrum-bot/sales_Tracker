import { NextRequest, NextResponse } from 'next/server'
import { syncDailyLedger } from '@/lib/ledger-sync'

export async function POST(request: NextRequest) {
  try {
    const { store_id, date } = await request.json()

    if (!store_id || !date) {
      return NextResponse.json({ error: 'store_id and date are required' }, { status: 400 })
    }

    const result = await syncDailyLedger(store_id, date)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync ledger' }, { status: 500 })
  }
}
