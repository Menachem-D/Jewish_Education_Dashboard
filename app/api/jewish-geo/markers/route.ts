import { getAllCities } from '@/lib/jewish-geo';
import type { MapRecord } from '@/types/map-record';

function jitter(val: number, scale = 0.05): number {
  return val + (Math.random() - 0.5) * scale;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const types = searchParams.get('types')?.split(',') ?? ['synagogue', 'chabad', 'day_school'];

  const cities = getAllCities().filter(c => c.lat !== null && c.lng !== null);
  const records: MapRecord[] = [];
  let id = 0;

  for (const city of cities) {
    const baseLat = city.lat!;
    const baseLng = city.lng!;

    if (types.includes('synagogue')) {
      for (const name of city.synagogues) {
        records.push({
          id: `geo-syn-${id++}`,
          layer_type: 'synagogue',
          name,
          country: city.country,
          state_province: city.state,
          city: city.city,
          latitude: jitter(baseLat, 0.04),
          longitude: jitter(baseLng, 0.06),
        });
      }
    }

    if (types.includes('chabad')) {
      for (const name of city.chabad_houses) {
        records.push({
          id: `geo-chabad-${id++}`,
          layer_type: 'chabad',
          name,
          country: city.country,
          state_province: city.state,
          city: city.city,
          latitude: jitter(baseLat, 0.04),
          longitude: jitter(baseLng, 0.06),
        });
      }
    }

    if (types.includes('day_school')) {
      for (const name of city.day_schools) {
        records.push({
          id: `geo-school-${id++}`,
          layer_type: 'day_school',
          name,
          country: city.country,
          state_province: city.state,
          city: city.city,
          latitude: jitter(baseLat, 0.04),
          longitude: jitter(baseLng, 0.06),
        });
      }
    }
  }

  return Response.json(records);
}
