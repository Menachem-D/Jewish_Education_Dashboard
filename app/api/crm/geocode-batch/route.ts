import * as db from '@/lib/crm-db';

async function geocodeLocation(
  city?: string | null,
  state?: string | null,
  country?: string | null,
): Promise<{ lat: number; lng: number } | null> {
  const q = [city, state, country].filter(Boolean).join(', ');
  if (!q) return null;

  // Nominatim rate limit: 1 request per second
  await new Promise((r) => setTimeout(r, 1100));

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'JewishDispatchMap/1.0 menachemdesign.tech@gmail.com' } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function POST() {
  const toGeocode = db.listUngeocodedFamilies();
  const batch = toGeocode.slice(0, 5); // max 5 per call (~5.5 s, well within 30 s limit)
  let geocoded = 0;

  for (const f of batch) {
    const coords = await geocodeLocation(f.city, f.state_province, f.country);
    if (coords) {
      db.updateFamilyCoords(f.id, coords.lat, coords.lng);
      geocoded++;
    }
  }

  return Response.json({ geocoded, remaining: toGeocode.length - batch.length });
}
