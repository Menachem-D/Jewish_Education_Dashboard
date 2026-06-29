import { getCitiesForRegion } from '@/lib/jewish-geo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state   = searchParams.get('state')   ?? '';
  const country = (searchParams.get('country') ?? 'US') as 'US' | 'CA';

  if (!state) return Response.json([], { status: 200 });

  const cities = getCitiesForRegion(state, country);
  return Response.json(cities);
}
