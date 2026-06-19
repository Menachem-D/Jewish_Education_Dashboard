import * as db from '@/lib/crm-db';

interface ImportRow {
  family: Record<string, unknown>;
  children: Record<string, unknown>[];
}

export async function POST(request: Request) {
  const { rows }: { rows: ImportRow[] } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'No rows provided' }, { status: 400 });
  }
  const result = db.bulkImport(rows);
  return Response.json(result);
}
