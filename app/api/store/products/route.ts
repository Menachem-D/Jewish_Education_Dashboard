import * as db from '@/lib/store-db'
import type { ProductCategory } from '@/types/store'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const include_inactive = searchParams.get('include_inactive') === 'true'
  return Response.json(db.listProducts({ include_inactive }))
}

export async function POST(request: Request) {
  const body = await request.json() as {
    name?: string
    sku?: string | null
    description?: string | null
    category?: ProductCategory
    price_cents?: number
    stock_quantity?: number
    is_active?: boolean
  }

  if (!body.name?.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const product = db.createProduct({
    name: body.name.trim(),
    sku: body.sku ?? null,
    description: body.description ?? null,
    category: body.category ?? 'other',
    price_cents: Math.max(0, Math.round(body.price_cents ?? 0)),
    stock_quantity: Math.max(0, Math.round(body.stock_quantity ?? 0)),
    is_active: body.is_active ?? true,
  })

  return Response.json(product, { status: 201 })
}
