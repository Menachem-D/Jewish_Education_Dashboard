import * as db from '@/lib/store-db'
import type { OrderStatus } from '@/types/store'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const order = db.getOrder(id)
  if (!order) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(order)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json() as {
    status?: OrderStatus
    notes?: string | null
    shipping_address?: string | null
  }
  const updated = db.updateOrder(id, body)
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(updated)
}
