import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncCombinedLedger } from '@/lib/combined-sync'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date } = await request.json()

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const result = await syncCombinedLedger(supabase, date, user.id)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync ledger' }, { status: 500 })
  }
}
