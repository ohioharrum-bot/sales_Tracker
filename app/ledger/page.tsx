import DailySalesLedger from '@/components/DailySalesLedger'

export default function LedgerPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Daily Sales Ledger</h1>
      <DailySalesLedger />
    </div>
  )
}