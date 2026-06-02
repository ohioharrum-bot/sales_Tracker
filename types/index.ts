export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other'
export type PayoutStatus = 'pending' | 'paid'

export interface Store {
  id: string
  owner_id: string
  name: string
  description: string | null
  created_at: string
}

export interface Sale {
  id: string
  store_id: string
  date: string
  amount: number
  category: string
  payment_method: PaymentMethod
  notes: string | null
  created_at: string
}

export interface Payout {
  id: string
  store_id: string
  recipient_name: string
  amount: number
  method: PaymentMethod
  date: string
  status: PayoutStatus
  notes: string | null
  created_at: string
}

export interface Expense {
  id: string
  store_id: string
  vendor: string | null
  category: string
  amount: number
  receipt_url: string | null
  date: string
  notes: string | null
  created_at: string
}

// For dashboard KPIs
export interface StoreKPIs {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  pendingPayouts: number
}
