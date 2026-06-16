'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ShoppingCart, Menu, X } from 'lucide-react'

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'POS System', href: '/pos' },
  { label: 'Stores',    href: '/dashboard/stores' },
  { label: 'Ledger',    href: '/ledger' },
]

const STORE_NAV = [
  { label: 'Overview',     path: '' },
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
  const [isOpen, setIsOpen] = useState(false)
  const storeId = params?.storeId as string | undefined

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-zen-accent text-white rounded-full shadow-2xl shadow-zen-accent/40 active:scale-95 transition-all"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-zen-border flex flex-col shrink-0 transition-transform duration-300 lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 py-8 border-b border-slate-50 flex items-center justify-between">
          <div className="w-10 h-10 bg-zen-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-zen-accent/10">
            <ShoppingCart size={24} />
          </div>
          <span className="lg:hidden font-black text-zen-text text-xl">Menu</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
                pathname === item.href ? 'bg-zen-accent text-white shadow-lg shadow-zen-accent/20' : 'text-zen-muted hover:bg-slate-50 hover:text-zen-text'
              )}
            >
              {item.label}
            </Link>
          ))}

          {storeId && (
            <div className="pt-8">
              <p className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Location Management</p>
              {STORE_NAV.map(item => {
                const href = `/dashboard/stores/${storeId}${item.path ? `/${item.path}` : ''}`
                const isActive = item.path === '' 
                  ? pathname === `/dashboard/stores/${storeId}`
                  : pathname.startsWith(href)
                  
                return (
                  <Link 
                    key={href} 
                    href={href} 
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
                      isActive ? 'bg-slate-900 text-white shadow-xl' : 'text-zen-muted hover:bg-slate-50 hover:text-zen-text'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100 mt-auto">
          <p className="text-xs text-gray-400 truncate mb-2 px-4">{userEmail}</p>
          <button 
            onClick={handleLogout} 
            className="w-full text-left px-4 py-2 text-xs text-gray-500 hover:text-red-600 font-bold transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
