import { getAllCities } from '@/lib/jewish-geo';

export async function GET() {
  const cities = getAllCities();

  const usCities = cities.filter(c => c.country === 'US');
  const caCities = cities.filter(c => c.country === 'CA');

  const totalJewishPop = cities.reduce((s, c) => s + (c.jewish_population ?? 0), 0);
  const totalChildPop = cities.reduce((s, c) => s + (c.jewish_child_population ?? 0), 0);
  const totalSynagogues = cities.reduce((s, c) => s + c.synagogues.length, 0);
  const totalChabad = cities.reduce((s, c) => s + c.chabad_houses.length, 0);
  const totalSchools = cities.reduce((s, c) => s + c.day_schools.length, 0);

  // Coverage deserts: cities with Jewish children but no elementary schools
  const deserts = cities
    .filter(c => (c.jewish_child_population ?? 0) > 500 && c.day_schools.length === 0)
    .sort((a, b) => (b.jewish_child_population ?? 0) - (a.jewish_child_population ?? 0))
    .slice(0, 30);

  // State-level aggregation for choropleth
  const stateMap: Record<string, { pop: number; schools: number; chabad: number }> = {};
  for (const c of cities) {
    if (!stateMap[c.state]) stateMap[c.state] = { pop: 0, schools: 0, chabad: 0 };
    stateMap[c.state].pop += c.jewish_population ?? 0;
    stateMap[c.state].schools += c.day_schools.length;
    stateMap[c.state].chabad += c.chabad_houses.length;
  }

  return Response.json({
    totalJewishPop,
    totalChildPop,
    totalSynagogues,
    totalChabad,
    totalSchools,
    usCityCount: usCities.length,
    caCityCount: caCities.length,
    deserts,
    stateMap,
  });
}
