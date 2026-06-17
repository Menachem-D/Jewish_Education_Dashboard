import { fetchSynagogues } from '@/lib/google-sheets';

export async function GET() {
  const records = await fetchSynagogues();
  return Response.json(records);
}
