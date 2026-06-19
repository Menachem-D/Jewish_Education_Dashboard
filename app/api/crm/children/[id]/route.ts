import * as db from '@/lib/crm-db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const child = db.updateChild(id, body);
  if (!child) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(child);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.deleteChild(id);
  return new Response(null, { status: 204 });
}
