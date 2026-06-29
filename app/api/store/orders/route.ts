import * as db from '@/lib/store-db'
import type { OrderStatus } from '@/types/store'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as OrderStatus | null
  const family_id = searchParams.get('family_id') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '50'))
  const stats_only = searchParams.get('stats') === 'true'

  if (stats_only) return Response.json(db.getStoreStats())

  return Response.json(
    db.listOrders({ status: status ?? undefined, family_id, page, limit }),
  )
}

export async function POST(request: Request) {
  const body = await request.json() as {
    family_id?: string | null
    family_name?: string | null
    order_date?: string
    status?: OrderStatus
    shipping_address?: string | null
    notes?: string | null
    items?: Array<{
      product_id: string
      product_name: string
      quantity: number
      unit_price_cents: number
    }>
  }

  if (!body.items?.length) {
    return Response.json({ error: 'items are required' }, { status: 400 })
  }

  const order = db.createOrder(
    {
      family_id: body.family_id ?? null,
      family_name: body.family_name ?? null,
      order_date: body.order_date ?? new Date().toISOString(),
      status: body.status ?? 'pending',
      shipping_address: body.shipping_address ?? null,
      notes: body.notes ?? null,
    },
    body.items,
  )

  return Response.json(order, { status: 201 })
}
