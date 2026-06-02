'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Dashboard',  href: '/dashboard' },
  { label: 'Stores',     href: '/dashboard/stores' },
]

const STORE_NAV = [
  { label: 'Sales',      path: 'sales' },
  { label: 'Payouts',    path: 'payouts' },
  { label: 'Expenses',   path: 'expenses' },
  { label: 'Reports',    path: 'reports' },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const storeId = params?.storeId as string | undefined

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 shadow-xl z-20">
      {/* Logo */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
            S
          </div>
          <span className="text-lg font-bold text-white tracking-tight">SalesTracker</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">
          General
        </p>
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
              pathname === item.href
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'hover:bg-slate-800 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        ))}

        {/* Store sub-nav — shown when inside a store */}
        {storeId && (
          <div className="pt-8">
            <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">
              Current Store
            </p>
            <div className="space-y-1">
              {STORE_NAV.map(item => {
                const href = `/dashboard/stores/${storeId}/${item.path}`
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-slate-800 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none'
                        : 'hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User + logout */}
      <div className="p-4 bg-slate-950/50 mt-auto border-t border-slate-800">
        <div className="px-2 mb-3">
          <p className="text-xs font-semibold text-slate-400 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
        >
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}