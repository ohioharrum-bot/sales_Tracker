import { createClient } from '@/lib/supabase/server'
import { Card, EmptyState, PageHeader, Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function StoresPage() {
  const supabase = await createClient()

  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Business Locations"
        description="Select a store to manage its operations"
        action={
          <Link href="/dashboard/stores/new">
            <Button size="md">+ Register New Store</Button>
          </Link>
        }
      />

      {!stores || stores.length === 0 ? (
        <EmptyState
          message="You haven't registered any stores yet. Create one to start tracking."
          action={
            <Link href="/dashboard/stores/new">
              <Button size="lg">Register Your First Store</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map(store => (
            <Link key={store.id} href={`/dashboard/stores/${store.id}/sales`}>
              <Card className="p-6 hover:border-emerald-400 hover:shadow-xl transition-all cursor-pointer group h-full flex flex-col justify-between border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-slate-300 group-hover:text-emerald-400 transition-colors">&rarr;</span>
                  </div>
                  <p className="font-black text-slate-900 text-lg mb-1">{store.name}</p>
                  {store.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{store.description}</p>
                  )}
                </div>
                <div className="mt-8 pt-4 border-t border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Active since {formatDate(store.created_at)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
  }