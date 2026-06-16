'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DailySalesLedger from '@/components/DailySalesLedger'
import { Store } from '@/types'
import { Spinner } from '@/components/ui'

export default function LedgerPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadStores() {
      const { data } = await supabase
        .from('stores')
        .select('*')
        .order('name')
      
      if (data) {
        setStores(data)
        if (data.length > 0) {
          setSelectedStoreId(data[0].id)
        }
      }
      setLoading(false)
    }
    loadStores()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-4">No Stores Found</h1>
        <p className="text-slate-500 mb-8">You need to create a store before you can use the ledger.</p>
        <a 
          href="/dashboard/stores/new"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
        >
          Create your first store
        </a>
      </div>
    )
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Daily Sales Ledger</h1>
          <p className="text-sm text-slate-500 font-medium">
            {selectedStore ? `Managing ledger for ${selectedStore.name}` : 'Select a store to manage its ledger'}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Store</label>
          <select 
            value={selectedStoreId || ''} 
            onChange={(e: any) => setSelectedStoreId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-w-[200px] shadow-sm"
          >
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedStoreId && (
        <DailySalesLedger storeId={selectedStoreId} />
      )}
    </div>
  )
}