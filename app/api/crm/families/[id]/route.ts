import * as db from '@/lib/crm-db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const family = db.getFamily(id);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(family);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const family = db.updateFamily(id, body);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(family);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.deleteFamily(id);
  return new Response(null, { status: 204 });
}
