'use client'

import { use } from 'react'
import DailySalesLedger from '@/components/DailySalesLedger'

export default function LedgerPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <DailySalesLedger storeId={storeId} />
    </div>
  )
}
