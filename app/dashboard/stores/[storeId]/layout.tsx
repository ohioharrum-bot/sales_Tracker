import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ storeId: string }>
}) {
  const { storeId } = await params
  const supabase = await createClient()
  
  const { data: store, error } = await supabase
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single()

  if (error || !store) {
    notFound()
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {store.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">
            {store.name}
          </h1>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
          Store Management Console
        </p>
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </div>
    </div>
  )
}
