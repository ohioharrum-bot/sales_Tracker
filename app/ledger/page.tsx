import DailySalesLedger from '@/components/DailySalesLedger'

export default function LedgerPage() {
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Daily Sales Ledger</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your daily sales, payouts, and distributor taxes</p>
        </div>
      </div>
      <DailySalesLedger />
    </div>
  )
}