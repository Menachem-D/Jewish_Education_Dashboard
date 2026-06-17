import { fetchPopulation } from '@/lib/google-sheets';

export async function GET() {
  const records = await fetchPopulation();
  return Response.json(records);
}
