import { fetchHeadShluchim } from '@/lib/google-sheets';

export async function GET() {
  const records = await fetchHeadShluchim();
  return Response.json(records);
}
