'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, ShoppingCart, DollarSign, AlertTriangle,
  Plus, Pencil, Trash2, X, Check, ChevronDown, BarChart3,
} from 'lucide-react'
import type {
  Product, Order, StoreStats, ProductCategory, OrderStatus,
} from '@/types/store'
import { PRODUCT_CATEGORIES, ORDER_STATUSES } from '@/types/store'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending:   'bg-amber-400/10  text-amber-400  border border-amber-400/20',
  fulfilled: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
  cancelled: 'bg-red-400/10    text-red-400    border border-red-400/20',
  returned:  'bg-slate-500/20  text-slate-400  border border-slate-500/30',
}

const STOCK_STYLE = (qty: number) =>
  qty === 0
    ? 'text-red-400 bg-red-400/10'
    : qty <= 5
      ? 'text-amber-400 bg-amber-400/10'
      : 'text-emerald-400 bg-emerald-400/10'

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, warn,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  warn?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-slate-800/50 rounded-lg border border-slate-700/40 min-w-0">
      <div className={`p-1.5 rounded-md ${warn ? 'bg-amber-400/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 leading-none mb-0.5">{label}</div>
        <div className="font-semibold text-slate-100 text-sm leading-none">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── Product Form (modal) ──────────────────────────────────────────────────────

interface ProductFormProps {
  initial?: Product | null
  onSave: (data: Partial<Product>) => Promise<void>
  onClose: () => void
}

function ProductForm({ initial, onSave, onClose }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [sku, setSku] = useState(initial?.sku ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? 'workbook')
  const [priceDollars, setPriceDollars] = useState(
    initial ? (initial.price_cents / 100).toFixed(2) : '',
  )
  const [stock, setStock] = useState(String(initial?.stock_quantity ?? ''))
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    const price_cents = Math.round(parseFloat(priceDollars || '0') * 100)
    if (isNaN(price_cents) || price_cents < 0) { setError('Invalid price'); return }
    setSaving(true)
    setError('')
    await onSave({
      name: name.trim(),
      sku: sku.trim() || null,
      description: description.trim() || null,
      category,
      price_cents,
      stock_quantity: Math.max(0, parseInt(stock || '0')),
      is_active: isActive,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h3 className="font-semibold text-slate-100">{initial ? 'Edit Product' : 'Add Product'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Name *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              placeholder="Aleph-Bet Workbook"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">SKU</label>
              <input
                value={sku} onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                placeholder="WB-001"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Price (USD)</label>
              <input
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                type="number" min="0" step="0.01"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                placeholder="24.99"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stock</label>
              <input
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                type="number" min="0" step="1"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-blue-500' : 'bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs text-slate-400">Active (visible in orders)</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Product'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── New Order Form (modal) ────────────────────────────────────────────────────

interface NewOrderFormProps {
  products: Product[]
  onSave: (data: {
    family_name: string | null
    notes: string | null
    items: Array<{ product_id: string; product_name: string; quantity: number; unit_price_cents: number }>
  }) => Promise<void>
  onClose: () => void
}

function NewOrderForm({ products, onSave, onClose }: NewOrderFormProps) {
  const activeProducts = products.filter((p) => p.is_active && p.stock_quantity > 0)
  const [familyName, setFamilyName] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Array<{ product_id: string; quantity: number }>>([
    { product_id: '', quantity: 1 },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalCents = lines.reduce((sum, line) => {
    const p = activeProducts.find((x) => x.id === line.product_id)
    return sum + (p ? p.price_cents * line.quantity : 0)
  }, 0)

  function setLine(idx: number, field: 'product_id' | 'quantity', value: string | number) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  function addLine() {
    setLines((prev) => [...prev, { product_id: '', quantity: 1 }])
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validLines = lines.filter((l) => l.product_id && l.quantity > 0)
    if (!validLines.length) { setError('Add at least one product'); return }
    setSaving(true)
    setError('')
    await onSave({
      family_name: familyName.trim() || null,
      notes: notes.trim() || null,
      items: validLines.map((l) => {
        const p = activeProducts.find((x) => x.id === l.product_id)!
        return {
          product_id: l.product_id,
          product_name: p.name,
          quantity: l.quantity,
          unit_price_cents: p.price_cents,
        }
      }),
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h3 className="font-semibold text-slate-100">New Order</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Family name (optional)</label>
            <input
              value={familyName} onChange={(e) => setFamilyName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              placeholder="Cohen Family"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400">Products</label>
              <button
                type="button" onClick={addLine}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                + Add line
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={line.product_id}
                    onChange={(e) => setLine(idx, 'product_id', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select product…</option>
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {fmt(p.price_cents)} (stock: {p.stock_quantity})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number" min="1" value={line.quantity}
                    onChange={(e) => setLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100 text-center focus:outline-none focus:border-blue-500"
                  />
                  {lines.length > 1 && (
                    <button
                      type="button" onClick={() => removeLine(idx)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {totalCents > 0 && (
            <div className="text-right text-sm font-semibold text-slate-100">
              Total: {fmt(totalCents)}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <input
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              placeholder="Optional notes…"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {saving ? 'Creating…' : 'Create Order'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main StoreView ────────────────────────────────────────────────────────────

export default function StoreView() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderTotal, setOrderTotal] = useState(0)
  const [stats, setStats] = useState<StoreStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderPage, setOrderPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')

  const [productFormOpen, setProductFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const ORDER_PAGE_SIZE = 20

  const loadData = useCallback(async () => {
    setLoading(true)
    const [prodRes, statsRes] = await Promise.all([
      fetch('/api/store/products?include_inactive=true').then((r) => r.json()),
      fetch('/api/store/orders?stats=true').then((r) => r.json()),
    ])
    setProducts(prodRes)
    setStats(statsRes)
    setLoading(false)
  }, [])

  const loadOrders = useCallback(async (page: number, status: OrderStatus | '') => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(ORDER_PAGE_SIZE),
    })
    if (status) params.set('status', status)
    const res = await fetch(`/api/store/orders?${params}`).then((r) => r.json())
    setOrders(res.orders ?? [])
    setOrderTotal(res.total ?? 0)
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadOrders(orderPage, statusFilter) }, [loadOrders, orderPage, statusFilter])

  async function saveProduct(data: Partial<Product>) {
    if (editingProduct) {
      await fetch(`/api/store/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/store/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setProductFormOpen(false)
    setEditingProduct(null)
    loadData()
  }

  async function toggleProductActive(p: Product) {
    await fetch(`/api/store/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    loadData()
  }

  async function deleteProduct(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    await fetch(`/api/store/products/${p.id}`, { method: 'DELETE' })
    loadData()
  }

  async function createOrder(data: {
    family_name: string | null
    notes: string | null
    items: Array<{ product_id: string; product_name: string; quantity: number; unit_price_cents: number }>
  }) {
    await fetch('/api/store/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setNewOrderOpen(false)
    loadOrders(1, statusFilter)
    setOrderPage(1)
    loadData()
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    await fetch(`/api/store/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadOrders(orderPage, statusFilter)
    loadData()
  }

  const totalPages = Math.max(1, Math.ceil(orderTotal / ORDER_PAGE_SIZE))

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 tracking-wider uppercase">Loading store</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">

      {/* Stats strip */}
      <div className="flex gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900/90 overflow-x-auto shrink-0">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={fmt(stats?.total_revenue_cents ?? 0)}
          sub="from fulfilled orders"
        />
        <StatCard
          icon={ShoppingCart}
          label="Orders This Month"
          value={String(stats?.orders_this_month ?? 0)}
          sub={`${stats?.orders_total ?? 0} all-time`}
        />
        <StatCard
          icon={BarChart3}
          label="Pending"
          value={String(stats?.pending_orders ?? 0)}
          warn={(stats?.pending_orders ?? 0) > 0}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={String(stats?.low_stock_products.length ?? 0)}
          sub={stats?.low_stock_products.map((p) => p.name).join(', ') || 'All good'}
          warn={(stats?.low_stock_products.length ?? 0) > 0}
        />
        {(stats?.top_products.length ?? 0) > 0 && (
          <StatCard
            icon={Package}
            label="Top Seller"
            value={stats!.top_products[0].product_name}
            sub={`${stats!.top_products[0].units_sold} units sold`}
          />
        )}
      </div>

      {/* Main two-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Products column */}
        <div className="w-72 shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Products</span>
            <button
              onClick={() => { setEditingProduct(null); setProductFormOpen(true) }}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600">
                <Package size={28} />
                <p className="text-xs">No products yet</p>
                <button
                  onClick={() => { setEditingProduct(null); setProductFormOpen(true) }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Add your first product
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {products.map((p) => (
                  <div key={p.id} className={`px-4 py-3 ${p.is_active ? '' : 'opacity-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-slate-100 font-medium truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {PRODUCT_CATEGORIES.find((c) => c.value === p.category)?.label}
                          {p.sku && ` · ${p.sku}`}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingProduct(p); setProductFormOpen(true) }}
                          className="p-1 text-slate-600 hover:text-slate-300 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => deleteProduct(p)}
                          className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-semibold text-slate-200">{fmt(p.price_cents)}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STOCK_STYLE(p.stock_quantity)}`}>
                          {p.stock_quantity} in stock
                        </span>
                        <button
                          onClick={() => toggleProductActive(p)}
                          title={p.is_active ? 'Deactivate' : 'Activate'}
                          className={`w-6 h-3.5 rounded-full transition-colors ${p.is_active ? 'bg-blue-500' : 'bg-slate-600'}`}
                        >
                          <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform mx-0.5 ${p.is_active ? 'translate-x-2.5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Orders column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Orders {orderTotal > 0 && <span className="text-slate-600 font-normal normal-case">({orderTotal})</span>}
            </span>

            <div className="flex items-center gap-2">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); setOrderPage(1) }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              <button
                onClick={() => setNewOrderOpen(true)}
                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={12} /> New Order
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600">
                <ShoppingCart size={28} />
                <p className="text-xs">No orders{statusFilter ? ` with status "${statusFilter}"` : ' yet'}</p>
                {!statusFilter && (
                  <button
                    onClick={() => setNewOrderOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Create first order
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {orders.map((order) => {
                  const expanded = expandedOrder === order.id
                  return (
                    <div key={order.id} className="px-5 py-3">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setExpandedOrder(expanded ? null : order.id)}
                      >
                        <ChevronDown
                          size={14}
                          className={`text-slate-600 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-200 font-medium truncate">
                              {order.family_name ?? 'No family linked'}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLE[order.status]}`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatDate(order.order_date)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-slate-200 shrink-0">
                          {fmt(order.total_cents)}
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-3 ml-5 pl-3 border-l border-slate-700/50 space-y-3">
                          {/* Line items */}
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-xs text-slate-400">
                                <span>{item.quantity}× {item.product_name}</span>
                                <span>{fmt(item.unit_price_cents * item.quantity)}</span>
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <p className="text-xs text-slate-500 italic">{order.notes}</p>
                          )}

                          {/* Status update */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-600">Update status:</span>
                            {ORDER_STATUSES.filter((s) => s.value !== order.status).map((s) => (
                              <button
                                key={s.value}
                                onClick={() => updateOrderStatus(order.id, s.value)}
                                className="text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
                              >
                                → {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-2 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                disabled={orderPage === 1}
                className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-slate-600">
                Page {orderPage} of {totalPages}
              </span>
              <button
                onClick={() => setOrderPage((p) => Math.min(totalPages, p + 1))}
                disabled={orderPage === totalPages}
                className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {productFormOpen && (
        <ProductForm
          initial={editingProduct}
          onSave={saveProduct}
          onClose={() => { setProductFormOpen(false); setEditingProduct(null) }}
        />
      )}
      {newOrderOpen && (
        <NewOrderForm
          products={products}
          onSave={createOrder}
          onClose={() => setNewOrderOpen(false)}
        />
      )}
    </div>
  )
}
