import * as db from '@/lib/crm-db';

export async function POST(request: Request) {
  const body = await request.json();
  const child = db.addChild(body);
  return Response.json(child, { status: 201 });
}
