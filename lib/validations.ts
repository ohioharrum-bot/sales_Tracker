import { z } from 'zod'

export const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100),
  description: z.string().max(500).optional(),
})

export const saleSchema = z.object({
  store_id: z.string().uuid(),
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  payment_method: z.enum(['cash', 'card', 'transfer', 'other']),
  notes: z.string().optional(),
})

export const payoutSchema = z.object({
  store_id: z.string().uuid(),
  recipient_name: z.string().min(1, 'Recipient name is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  method: z.enum(['cash', 'card', 'transfer', 'other']),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['pending', 'paid']),
  notes: z.string().optional(),
})

export const expenseSchema = z.object({
  store_id: z.string().uuid(),
  vendor: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  receipt_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
})

export const dailyLedgerSchema = z.object({
  store_id:      z.string().uuid(),
  date:          z.string().min(1, 'Date is required'),
  sale:          z.coerce.number().min(0).default(0),
  pay_out:       z.coerce.number().min(0).default(0),
  bills:         z.coerce.number().min(0).default(0),
  payroll:       z.coerce.number().min(0).default(0),
  day_savings:   z.coerce.number().min(0).default(0),
  total_savings: z.coerce.number().min(0).default(0),
  notes:         z.string().optional(),
})

export const distributorPurchaseSchema = z.object({
  store_id:    z.string().uuid(),
  date:        z.string().min(1, 'Date is required'),
  distributor: z.enum(['budweiser', 'cdc', 'heidelberg', 'glazers', 'filichia']),
  type:        z.enum(['alcohol', 'tobacco']),
  amount:      z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  notes:       z.string().optional(),
})

export type StoreInput   = z.infer<typeof storeSchema>
export type SaleInput    = z.infer<typeof saleSchema>
export type PayoutInput  = z.infer<typeof payoutSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type DailyLedgerInput       = z.infer<typeof dailyLedgerSchema>
export type DistributorPurchaseInput = z.infer<typeof distributorPurchaseSchema>
