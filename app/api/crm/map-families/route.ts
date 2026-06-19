import * as db from '@/lib/crm-db';
import type { MapRecord } from '@/types/map-record';

export async function GET() {
  const families = db.listFamilies({});
  const mapRecords: MapRecord[] = families
    .filter((f) => f.latitude != null && f.longitude != null)
    .map((f) => ({
      id: `family:${f.id}`,
      layer_type: 'family' as const,
      name: `${f.family_name} Family`,
      country: f.country ?? '',
      state_province: f.state_province ?? '',
      city: f.city ?? '',
      latitude: f.latitude!,
      longitude: f.longitude!,
      affiliation: f.affiliation ?? undefined,
      notes: f.notes ?? undefined,
      family_record_id: f.id,
    }));
  return Response.json(mapRecords);
}
