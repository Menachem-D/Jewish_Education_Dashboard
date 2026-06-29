export interface Region {
  name: string;
  abbr: string;
  country: 'US' | 'CA';
  lat: number;
  lng: number;
  zoom: number;
  headShliach?: string;
}

export const US_STATES: Region[] = [
  { name: 'Alabama',        abbr: 'AL', country: 'US', lat: 32.81,  lng: -86.79,  zoom: 7 },
  { name: 'Alaska',         abbr: 'AK', country: 'US', lat: 64.20,  lng: -153.41, zoom: 4 },
  { name: 'Arizona',        abbr: 'AZ', country: 'US', lat: 34.05,  lng: -111.09, zoom: 6,  headShliach: 'Rabbi Zalman Levertov' },
  { name: 'Arkansas',       abbr: 'AR', country: 'US', lat: 34.80,  lng: -92.20,  zoom: 7 },
  { name: 'California',     abbr: 'CA', country: 'US', lat: 36.78,  lng: -119.42, zoom: 5,  headShliach: 'Rabbi Shlomo Cunin' },
  { name: 'Colorado',       abbr: 'CO', country: 'US', lat: 39.55,  lng: -105.78, zoom: 6,  headShliach: 'Rabbi Yisroel Engel' },
  { name: 'Connecticut',    abbr: 'CT', country: 'US', lat: 41.60,  lng: -72.69,  zoom: 9,  headShliach: 'Rabbi Yossi Yaffe' },
  { name: 'Delaware',       abbr: 'DE', country: 'US', lat: 38.91,  lng: -75.53,  zoom: 9 },
  { name: 'Florida',        abbr: 'FL', country: 'US', lat: 27.66,  lng: -81.52,  zoom: 6,  headShliach: 'Rabbi Avremel Korf' },
  { name: 'Georgia',        abbr: 'GA', country: 'US', lat: 32.16,  lng: -82.90,  zoom: 7,  headShliach: 'Rabbi Isser Zalman Weisberg' },
  { name: 'Hawaii',         abbr: 'HI', country: 'US', lat: 19.90,  lng: -155.58, zoom: 7 },
  { name: 'Idaho',          abbr: 'ID', country: 'US', lat: 44.07,  lng: -114.74, zoom: 6 },
  { name: 'Illinois',       abbr: 'IL', country: 'US', lat: 40.35,  lng: -88.99,  zoom: 6,  headShliach: 'Rabbi Meir Moscowitz' },
  { name: 'Indiana',        abbr: 'IN', country: 'US', lat: 39.85,  lng: -86.26,  zoom: 7 },
  { name: 'Iowa',           abbr: 'IA', country: 'US', lat: 42.01,  lng: -93.21,  zoom: 7 },
  { name: 'Kansas',         abbr: 'KS', country: 'US', lat: 38.53,  lng: -96.73,  zoom: 7 },
  { name: 'Kentucky',       abbr: 'KY', country: 'US', lat: 37.67,  lng: -84.67,  zoom: 7 },
  { name: 'Louisiana',      abbr: 'LA', country: 'US', lat: 31.17,  lng: -91.87,  zoom: 7 },
  { name: 'Maine',          abbr: 'ME', country: 'US', lat: 45.25,  lng: -69.45,  zoom: 7 },
  { name: 'Maryland',       abbr: 'MD', country: 'US', lat: 39.05,  lng: -76.64,  zoom: 8,  headShliach: 'Rabbi Shmuel Kaplan' },
  { name: 'Massachusetts',  abbr: 'MA', country: 'US', lat: 42.23,  lng: -71.53,  zoom: 8,  headShliach: 'Rabbi Levi Fogelman' },
  { name: 'Michigan',       abbr: 'MI', country: 'US', lat: 44.31,  lng: -85.60,  zoom: 6,  headShliach: 'Rabbi Shmulik Zajac' },
  { name: 'Minnesota',      abbr: 'MN', country: 'US', lat: 46.73,  lng: -94.69,  zoom: 6,  headShliach: 'Rabbi Moshe Feller' },
  { name: 'Mississippi',    abbr: 'MS', country: 'US', lat: 32.74,  lng: -89.68,  zoom: 7 },
  { name: 'Missouri',       abbr: 'MO', country: 'US', lat: 38.46,  lng: -92.29,  zoom: 7,  headShliach: 'Rabbi Yosef Landa' },
  { name: 'Montana',        abbr: 'MT', country: 'US', lat: 46.88,  lng: -110.36, zoom: 6 },
  { name: 'Nebraska',       abbr: 'NE', country: 'US', lat: 41.49,  lng: -99.90,  zoom: 7 },
  { name: 'Nevada',         abbr: 'NV', country: 'US', lat: 38.80,  lng: -116.42, zoom: 6,  headShliach: 'Rabbi Shea Harlig' },
  { name: 'New Hampshire',  abbr: 'NH', country: 'US', lat: 43.19,  lng: -71.57,  zoom: 8 },
  { name: 'New Jersey',     abbr: 'NJ', country: 'US', lat: 40.06,  lng: -74.41,  zoom: 8,  headShliach: 'Rabbi Moshe Herson' },
  { name: 'New Mexico',     abbr: 'NM', country: 'US', lat: 34.52,  lng: -105.87, zoom: 6 },
  { name: 'New York',       abbr: 'NY', country: 'US', lat: 42.17,  lng: -74.95,  zoom: 7 },
  { name: 'North Carolina', abbr: 'NC', country: 'US', lat: 35.63,  lng: -79.81,  zoom: 7,  headShliach: 'Rabbi Yossi Groner' },
  { name: 'North Dakota',   abbr: 'ND', country: 'US', lat: 47.55,  lng: -101.00, zoom: 7 },
  { name: 'Ohio',           abbr: 'OH', country: 'US', lat: 40.42,  lng: -82.91,  zoom: 7,  headShliach: 'Rabbi Yitzchok Mangel' },
  { name: 'Oklahoma',       abbr: 'OK', country: 'US', lat: 35.47,  lng: -97.52,  zoom: 7 },
  { name: 'Oregon',         abbr: 'OR', country: 'US', lat: 43.80,  lng: -120.55, zoom: 6 },
  { name: 'Pennsylvania',   abbr: 'PA', country: 'US', lat: 40.59,  lng: -77.21,  zoom: 7,  headShliach: 'Rabbi Yisroel Rosenfeld' },
  { name: 'Rhode Island',   abbr: 'RI', country: 'US', lat: 41.68,  lng: -71.51,  zoom: 10 },
  { name: 'South Carolina', abbr: 'SC', country: 'US', lat: 33.84,  lng: -80.95,  zoom: 7 },
  { name: 'South Dakota',   abbr: 'SD', country: 'US', lat: 43.97,  lng: -99.90,  zoom: 7 },
  { name: 'Tennessee',      abbr: 'TN', country: 'US', lat: 35.52,  lng: -86.58,  zoom: 7,  headShliach: 'Rabbi Yitzchak Tiechtel' },
  { name: 'Texas',          abbr: 'TX', country: 'US', lat: 31.97,  lng: -99.90,  zoom: 5,  headShliach: 'Rabbi Shimon Lazaroff' },
  { name: 'Utah',           abbr: 'UT', country: 'US', lat: 39.32,  lng: -111.09, zoom: 6 },
  { name: 'Vermont',        abbr: 'VT', country: 'US', lat: 44.56,  lng: -72.58,  zoom: 8 },
  { name: 'Virginia',       abbr: 'VA', country: 'US', lat: 37.43,  lng: -78.66,  zoom: 7 },
  { name: 'Washington',     abbr: 'WA', country: 'US', lat: 47.75,  lng: -120.74, zoom: 7,  headShliach: 'Rabbi Sholom Ber Levitin' },
  { name: 'West Virginia',  abbr: 'WV', country: 'US', lat: 38.49,  lng: -80.95,  zoom: 7 },
  { name: 'Wisconsin',      abbr: 'WI', country: 'US', lat: 43.78,  lng: -88.79,  zoom: 7 },
  { name: 'Wyoming',        abbr: 'WY', country: 'US', lat: 43.08,  lng: -107.29, zoom: 6 },
  { name: 'Washington D.C.', abbr: 'DC', country: 'US', lat: 38.91, lng: -77.04,  zoom: 11, headShliach: 'Rabbi Levi Shemtov' },
];

export const CA_PROVINCES: Region[] = [
  { name: 'Alberta',                  abbr: 'AB', country: 'CA', lat: 53.93,  lng: -116.58, zoom: 5 },
  { name: 'British Columbia',         abbr: 'BC', country: 'CA', lat: 53.73,  lng: -127.65, zoom: 5 },
  { name: 'Manitoba',                 abbr: 'MB', country: 'CA', lat: 53.76,  lng: -98.81,  zoom: 5 },
  { name: 'New Brunswick',            abbr: 'NB', country: 'CA', lat: 46.57,  lng: -66.46,  zoom: 7 },
  { name: 'Newfoundland & Labrador',  abbr: 'NL', country: 'CA', lat: 53.14,  lng: -57.66,  zoom: 5 },
  { name: 'Nova Scotia',              abbr: 'NS', country: 'CA', lat: 44.68,  lng: -63.74,  zoom: 7 },
  { name: 'Northwest Territories',    abbr: 'NT', country: 'CA', lat: 64.28,  lng: -119.14, zoom: 4 },
  { name: 'Nunavut',                  abbr: 'NU', country: 'CA', lat: 70.30,  lng: -83.11,  zoom: 4 },
  { name: 'Ontario',                  abbr: 'ON', country: 'CA', lat: 51.25,  lng: -85.32,  zoom: 5 },
  { name: 'Prince Edward Island',     abbr: 'PE', country: 'CA', lat: 46.51,  lng: -63.42,  zoom: 9 },
  { name: 'Quebec',                   abbr: 'QC', country: 'CA', lat: 52.94,  lng: -73.55,  zoom: 5 },
  { name: 'Saskatchewan',             abbr: 'SK', country: 'CA', lat: 52.94,  lng: -106.45, zoom: 5 },
  { name: 'Yukon',                    abbr: 'YT', country: 'CA', lat: 64.28,  lng: -135.00, zoom: 5 },
];

export const ALL_REGIONS: Region[] = [...US_STATES, ...CA_PROVINCES];

// Match a raw state_province string to a region — handles full names and abbreviations
export function matchesRegion(stateProvince: string, region: Region): boolean {
  const s = stateProvince.toLowerCase().trim();
  if (!s) return false;
  return (
    s === region.abbr.toLowerCase() ||
    s === region.name.toLowerCase() ||
    s.startsWith(region.name.toLowerCase() + ',')
  );
}

// Find the region for a raw state_province string
export function findRegion(stateProvince: string): Region | undefined {
  if (!stateProvince) return undefined;
  return ALL_REGIONS.find((r) => matchesRegion(stateProvince, r));
}

// Get all records that belong to a region
export function recordsInRegion<T extends { state_province: string }>(
  records: T[],
  region: Region,
): T[] {
  return records.filter((r) => matchesRegion(r.state_province, region));
}
