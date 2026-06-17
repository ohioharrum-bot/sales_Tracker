import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncCombinedLedger } from '@/lib/combined-sync'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const targetEmail = 'syedharrumten@gmail.com'

  try {
    // 1. Find the user ID for the target email and their first store's timezone
    const { data: userData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', targetEmail)
      .single()

    let userId = userData?.id
    if (!userId) {
      const { data: anyStore } = await supabase.from('stores').select('owner_id').limit(1).single()
      userId = anyStore?.owner_id
    }

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the timezone from the first store of this user
    const { data: storeWithTz } = await supabase
      .from('stores')
      .select('timezone')
      .eq('owner_id', userId)
      .limit(1)
      .single()

    const timezone = storeWithTz?.timezone || 'America/New_York'
    const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone })

    // 2. Sync the combined ledger
    const result = await syncCombinedLedger(supabase, today, userId)

    if (!result) {
      return NextResponse.json({ message: 'No stores found to sync' })
    }

    // 3. Prepare Email
    const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
    
    const breakdownLines = result.breakdown
      .map((b: { name: string; amount: number }) => `${b.name.padEnd(20)}: ${fmt(b.amount)}`)
      .join('\n')

    const dateStr = new Date(today).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const emailBody = `
Daily Sales Summary — ${dateStr}

${breakdownLines}
─────────────────────────────────
Combined Total:         ${fmt(result.totalSales)}

Ledger updated ✅
    `.trim()

    // 4. Send Email using Resend API (via fetch)
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'Sales Tracker <updates@resend.dev>', // Replace with verified domain if available
          to: [targetEmail],
          subject: `Daily Sales Summary — ${dateStr}`,
          text: emailBody
        })
      })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
