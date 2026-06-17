export type DistributorName = 'budweiser' | 'cdc' | 'heidelberg' | 'glazers' | 'filichia'
export type DistributorType = 'alcohol' | 'tobacco'

export interface Store {
  id: string
  name: string
  description: string | null
  timezone: string
  owner_id: string
  created_at: string
}

export interface Sale {
  id: string
  store_id: string
  date: string
  amount: number
  category: string
  payment_method: 'cash' | 'card' | 'transfer' | 'other'
  notes: string | null
  created_at: string
}

export interface Payout {
  id: string
  store_id: string
  recipient_name: string
  amount: number
  method: 'cash' | 'card' | 'transfer' | 'other'
  date: string
  status: 'pending' | 'paid'
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

export interface DailyLedger {
  id: string
  store_id: string
  date: string
  sale: number
  pay_out: number
  bills: number
  payroll: number
  day_savings: number
  total_savings: number
  notes: string | null
  created_at: string
}

export interface DistributorPurchase {
  id: string
  store_id: string
  date: string
  distributor: DistributorName
  type: DistributorType
  amount: number
  notes: string | null
  created_at: string
}
