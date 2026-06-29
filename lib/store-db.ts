/**
 * JSON-file store layer — same zero-dependency pattern as crm-db.ts.
 * Swap read()/save() for Supabase queries when NEXT_PUBLIC_SUPABASE_URL is set.
 * Schema is in supabase/schema.sql — run it once, then wire up lib/supabase.ts.
 */
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type {
  Product,
  Order,
  OrderItem,
  OrderStatus,
  StoreStats,
} from '@/types/store'

const DATA_FILE = path.join(process.cwd(), 'data', 'store.json')

interface Store {
  products: Product[]
  orders: Omit<Order, 'items'>[]
  order_items: OrderItem[]
}

function read(): Store {
  try {
    if (!fs.existsSync(DATA_FILE)) return { products: [], orders: [], order_items: [] }
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Partial<Store>
    return {
      products: raw.products ?? [],
      orders: raw.orders ?? [],
      order_items: raw.order_items ?? [],
    }
  } catch {
    return { products: [], orders: [], order_items: [] }
  }
}

function save(store: Store): void {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const content = JSON.stringify(store, null, 2)
  const tmp = `${DATA_FILE}.tmp`
  try {
    fs.writeFileSync(tmp, content, 'utf-8')
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE)
    fs.renameSync(tmp, DATA_FILE)
  } catch {
    try { fs.unlinkSync(tmp) } catch { /* ignore cleanup */ }
    fs.writeFileSync(DATA_FILE, content, 'utf-8')
  }
}

function withItems(order: Omit<Order, 'items'>, items: OrderItem[]): Order {
  return { ...order, items: items.filter((i) => i.order_id === order.id) }
}

// ── Products ──────────────────────────────────────────────────────────────────

export function listProducts(opts: { include_inactive?: boolean } = {}): Product[] {
  const { products } = read()
  const list = opts.include_inactive ? products : products.filter((p) => p.is_active)
  return list.sort((a, b) => a.name.localeCompare(b.name))
}

export function getProduct(id: string): Product | null {
  return read().products.find((p) => p.id === id) ?? null
}

export function createProduct(
  data: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
): Product {
  const store = read()
  const now = new Date().toISOString()
  const product: Product = { id: randomUUID(), ...data, created_at: now, updated_at: now }
  store.products.push(product)
  save(store)
  return product
}

export function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'created_at'>>,
): Product | null {
  const store = read()
  const idx = store.products.findIndex((p) => p.id === id)
  if (idx === -1) return null
  store.products[idx] = { ...store.products[idx], ...data, updated_at: new Date().toISOString() }
  save(store)
  return store.products[idx]
}

export function deleteProduct(id: string): void {
  const store = read()
  store.products = store.products.filter((p) => p.id !== id)
  save(store)
}

// ── Orders ────────────────────────────────────────────────────────────────────

export function listOrders(opts: {
  status?: OrderStatus
  family_id?: string
  page?: number
  limit?: number
} = {}): { orders: Order[]; total: number } {
  const { orders, order_items } = read()
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(200, opts.limit ?? 50)

  let result = [...orders].sort(
    (a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime(),
  )
  if (opts.status) result = result.filter((o) => o.status === opts.status)
  if (opts.family_id) result = result.filter((o) => o.family_id === opts.family_id)

  const total = result.length
  const page_data = result.slice((page - 1) * limit, page * limit)
  return { orders: page_data.map((o) => withItems(o, order_items)), total }
}

export function getOrder(id: string): Order | null {
  const { orders, order_items } = read()
  const order = orders.find((o) => o.id === id)
  if (!order) return null
  return withItems(order, order_items)
}

export function createOrder(
  data: Omit<Order, 'id' | 'items' | 'total_cents' | 'created_at' | 'updated_at'>,
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price_cents: number
  }>,
): Order {
  const store = read()
  const now = new Date().toISOString()
  const id = randomUUID()

  const newItems: OrderItem[] = items.map((item) => ({
    id: randomUUID(),
    order_id: id,
    ...item,
    created_at: now,
  }))

  const total_cents = newItems.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0)

  const order: Omit<Order, 'items'> = {
    id,
    ...data,
    total_cents,
    created_at: now,
    updated_at: now,
  }

  store.orders.push(order)
  store.order_items.push(...newItems)

  // Decrement stock for each product ordered
  for (const item of items) {
    const pidx = store.products.findIndex((p) => p.id === item.product_id)
    if (pidx !== -1) {
      store.products[pidx] = {
        ...store.products[pidx],
        stock_quantity: Math.max(0, store.products[pidx].stock_quantity - item.quantity),
        updated_at: now,
      }
    }
  }

  save(store)
  return withItems(order, newItems)
}

export function updateOrder(
  id: string,
  data: Partial<Pick<Order, 'status' | 'notes' | 'shipping_address'>>,
): Order | null {
  const store = read()
  const idx = store.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  store.orders[idx] = { ...store.orders[idx], ...data, updated_at: new Date().toISOString() }
  save(store)
  return withItems(store.orders[idx], store.order_items)
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getStoreStats(): StoreStats {
  const { products, orders, order_items } = read()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const total_revenue_cents = orders
    .filter((o) => o.status === 'fulfilled')
    .reduce((sum, o) => sum + o.total_cents, 0)

  const orders_this_month = orders.filter((o) => o.order_date >= monthStart).length
  const pending_orders = orders.filter((o) => o.status === 'pending').length
  const low_stock_products = products
    .filter((p) => p.is_active && p.stock_quantity <= 5)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)

  // Top products by units sold across non-cancelled orders
  const sold: Record<string, { name: string; units: number }> = {}
  const cancelledOrderIds = new Set(
    orders.filter((o) => o.status === 'cancelled').map((o) => o.id),
  )
  for (const item of order_items) {
    if (cancelledOrderIds.has(item.order_id)) continue
    if (!sold[item.product_id]) sold[item.product_id] = { name: item.product_name, units: 0 }
    sold[item.product_id].units += item.quantity
  }
  const top_products = Object.values(sold)
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)
    .map((p) => ({ product_name: p.name, units_sold: p.units }))

  return {
    total_revenue_cents,
    orders_total: orders.length,
    orders_this_month,
    pending_orders,
    low_stock_products,
    top_products,
  }
}
