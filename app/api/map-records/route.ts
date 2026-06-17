import {
  fetchSynagogues,
  fetchDaySchools,
  fetchHeadShluchim,
  fetchPopulation,
} from '@/lib/google-sheets';
import type { MapRecord } from '@/types/map-record';

export async function GET() {
  const results = await Promise.allSettled([
    fetchSynagogues(),
    fetchDaySchools(),
    fetchHeadShluchim(),
    fetchPopulation(),
  ]);

  const records: MapRecord[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      records.push(...result.value);
    } else {
      const layers = ['synagogues', 'day-schools', 'head-shluchim', 'population'];
      console.error(`[map-records] Layer "${layers[index]}" failed:`, result.reason);
    }
  });

  return Response.json(records);
}
