'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Stores',    href: '/dashboard/stores' },
]

const STORE_NAV = [
  { label: 'Sales',        path: 'sales' },
  { label: 'Payouts',      path: 'payouts' },
  { label: 'Expenses',     path: 'expenses' },
  { label: 'Ledger',       path: 'ledger' },
  { label: 'Distributors', path: 'distributors' },
  { label: 'Reports',      path: 'reports' },
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
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="text-base font-semibold text-gray-900">Sales Tracker</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={cn(
            'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === item.href ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
          )}>{item.label}</Link>
        ))}

        {storeId && (
          <div className="pt-4">
            <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Store</p>
            {STORE_NAV.map(item => {
              const href = `/dashboard/stores/${storeId}/${item.path}`
              return (
                <Link key={href} href={href} className={cn(
                  'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                  pathname.startsWith(href) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                )}>{item.label}</Link>
              )
            })}
          </div>
        )}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 truncate mb-2">{userEmail}</p>
        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-600 transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  )
}
