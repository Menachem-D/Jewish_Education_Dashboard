import * as db from '@/lib/crm-db';

export async function GET() {
  const pairs = db.findDuplicates();
  return Response.json(pairs);
}

export async function DELETE(request: Request) {
  const { id1, id2 } = await request.json();
  db.dismissDuplicate(id1, id2);
  return new Response(null, { status: 204 });
}
