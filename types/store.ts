export type ProductCategory = 'workbook' | 'book' | 'kit' | 'digital' | 'other'
export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled' | 'returned'

export interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  category: ProductCategory
  price_cents: number       // Always integers — no float rounding errors
  stock_quantity: number
  is_active: boolean
  created_at: string        // ISO 8601
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string      // Snapshot at order time (product may be renamed later)
  quantity: number
  unit_price_cents: number  // Snapshot at order time
  created_at: string
}

export interface Order {
  id: string
  family_id: string | null
  family_name: string | null  // Denormalized for display — avoids extra joins
  order_date: string
  status: OrderStatus
  total_cents: number
  shipping_address: string | null
  notes: string | null
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface StoreStats {
  total_revenue_cents: number
  orders_total: number
  orders_this_month: number
  pending_orders: number
  low_stock_products: Product[]
  top_products: Array<{ product_name: string; units_sold: number }>
}

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'workbook', label: 'Workbook' },
  { value: 'book', label: 'Book' },
  { value: 'kit', label: 'Kit' },
  { value: 'digital', label: 'Digital' },
  { value: 'other', label: 'Other' },
]

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
]
