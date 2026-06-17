import { fetchDaySchools } from '@/lib/google-sheets';

export async function GET() {
  const records = await fetchDaySchools();
  return Response.json(records);
}
