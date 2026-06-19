import * as db from '@/lib/crm-db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: keepId } = await params;
  const { merge_id } = await request.json();
  const family = db.mergeFamilies(keepId, merge_id);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(family);
}
