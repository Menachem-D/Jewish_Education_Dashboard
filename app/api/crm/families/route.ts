import * as db from '@/lib/crm-db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const childAge = searchParams.get('child_age');

  const families = db.listFamilies({
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    child_age: childAge ? parseInt(childAge, 10) : undefined,
  });

  return Response.json(families);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { children, ...familyData } = body;
  const family = db.createFamily(familyData, children);
  return Response.json(family, { status: 201 });
}
