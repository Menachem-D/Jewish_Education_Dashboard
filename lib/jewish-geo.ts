import fs from 'fs';
import path from 'path';

export interface GeoSynagogue {
  name: string;
  denomination?: string;
}

export interface GeoDaySchool {
  name: string;
  type?: string;
}

export interface StudyLink {
  title: string;
  url: string;
}

export interface GeoCity {
  city: string;
  state: string;          // 2-letter abbreviation
  country: 'US' | 'CA';
  lat: number | null;
  lng: number | null;
  jewish_population: number | null;
  jewish_child_population: number | null;
  synagogues: string[];
  chabad_houses: string[];
  day_schools: string[];  // elementary only
  study_links: StudyLink[];
  market_penetration_est: number | null;
}

interface GeoStore {
  version: string;
  cities: GeoCity[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'jewish-geo.json');

let _cache: GeoStore | null = null;

function load(): GeoStore {
  if (_cache) return _cache;
  try {
    if (!fs.existsSync(DATA_FILE)) return { version: '1.0', cities: [] };
    _cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as GeoStore;
    return _cache;
  } catch {
    return { version: '1.0', cities: [] };
  }
}

export function getCitiesForRegion(state: string, country: 'US' | 'CA'): GeoCity[] {
  const store = load();
  return store.cities.filter(
    (c) =>
      c.state.toUpperCase() === state.toUpperCase() &&
      c.country === country,
  );
}

export function getAllCities(): GeoCity[] {
  return load().cities;
}
