import { google } from 'googleapis';
import { MapRecord } from '@/types/map-record';
import { SAMPLE_MAP_RECORDS } from './sample-map-records';

// ── CSV parser ──────────────────────────────────────────────────────────────
// Handles quoted fields, embedded commas, and "" escape sequences.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }

  if (row.length > 0 || field !== '') {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

// ── Convert 2D array to row objects ────────────────────────────────────────
function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (row[i] ?? '').trim();
      });
      return obj;
    })
    .filter((r) => Object.values(r).some((v) => v !== ''));
}

// ── Column reader with fallbacks ────────────────────────────────────────────
// Tries each key in order: exact match first, then case-insensitive.
export function col(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key].trim();
    const lower = key.toLowerCase();
    const found = Object.keys(row).find((k) => k.toLowerCase() === lower);
    if (found !== undefined && row[found] !== '') return row[found].trim();
  }
  return '';
}

// ── Data cleaners ───────────────────────────────────────────────────────────
function cleanCoord(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.trim());
  return isNaN(n) || n === 0 ? null : n;
}

function cleanPopulation(s: string): number | null {
  if (!s) return null;
  // Remove bracket citations like "[6]" and strip non-digit characters
  const clean = s.replace(/\[.*?\]/g, '').replace(/[^0-9]/g, '');
  const n = parseInt(clean, 10);
  return isNaN(n) || n === 0 ? null : n;
}

function cleanCity(s: string): string {
  return s.replace(/\[.*?\]/g, '').trim();
}

// ── Google Sheets API (service account) ────────────────────────────────────
async function fetchViaAPI(tabName: string): Promise<Record<string, string>[]> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !rawKey || !sheetId) {
    throw new Error('Service account credentials not configured');
  }

  const key = rawKey.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Quote sheet names that contain spaces
  const range = tabName.includes(' ') ? `'${tabName}'!A:Z` : `${tabName}!A:Z`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  return rowsToObjects(res.data.values ?? []);
}

// ── CSV URL fetch ───────────────────────────────────────────────────────────
async function fetchViaCSV(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, {
    next: { revalidate: 300 }, // cache 5 minutes
  });
  if (!res.ok) throw new Error(`CSV fetch failed: HTTP ${res.status} — ${url}`);
  const text = await res.text();
  return rowsToObjects(parseCSV(text));
}

// ── Main row fetcher ────────────────────────────────────────────────────────
// Priority: 1) Service account API, 2) CSV env var, 3) throw
async function fetchRows(
  tabName: string,
  csvEnvKey: string,
): Promise<Record<string, string>[]> {
  // 1. Try Google Sheets API with service account
  const hasCredentials =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID;

  if (hasCredentials) {
    try {
      return await fetchViaAPI(tabName);
    } catch (err) {
      console.warn(`[Sheets API] "${tabName}" failed:`, (err as Error).message);
    }
  }

  // 2. Try CSV URL from environment
  const csvUrl = process.env[csvEnvKey];
  if (csvUrl) {
    try {
      return await fetchViaCSV(csvUrl);
    } catch (err) {
      console.warn(`[CSV] "${tabName}" failed:`, (err as Error).message);
    }
  }

  throw new Error(
    `Could not fetch "${tabName}" — set ${csvEnvKey} or service account credentials.`,
  );
}

// ── Layer mappers ───────────────────────────────────────────────────────────

export async function fetchSynagogues(): Promise<MapRecord[]> {
  try {
    const rows = await fetchRows('Synagogues', 'GOOGLE_CSV_SYNAGOGUES');
    return rows.flatMap((row, i) => {
      const lat = cleanCoord(col(row, 'latitude', 'Latitude'));
      const lng = cleanCoord(col(row, 'longitude', 'Longitude'));
      if (lat === null || lng === null) return [];

      const locationId = col(row, 'location_id', 'Location ID');
      const name =
        col(row, 'synagogue_name', 'Synagogue Name', 'Name', 'name') ||
        col(row, 'notes', 'Notes') ||
        'Unnamed Synagogue';

      return [
        {
          id: `synagogue_${locationId || i + 1}`,
          layer_type: 'synagogue' as const,
          name,
          country: col(row, 'country', 'Country', 'Country/Region'),
          state_province: col(row, 'state_province', 'State/Province', 'State'),
          city: cleanCity(col(row, 'city', 'City')),
          metro_area: col(row, 'metro_area', 'Metro Area') || undefined,
          latitude: lat,
          longitude: lng,
          affiliation: col(row, 'affiliation', 'Affiliation') || undefined,
          notes: col(row, 'notes', 'Notes') || undefined,
          raw: row,
        },
      ];
    });
  } catch (err) {
    console.error('[Synagogues] falling back to sample data:', (err as Error).message);
    return SAMPLE_MAP_RECORDS.filter((r) => r.layer_type === 'synagogue');
  }
}

export async function fetchDaySchools(): Promise<MapRecord[]> {
  try {
    const rows = await fetchRows('Day Schools', 'GOOGLE_CSV_DAY_SCHOOLS');
    return rows.flatMap((row, i) => {
      const lat = cleanCoord(col(row, 'latitude', 'Latitude'));
      const lng = cleanCoord(col(row, 'longitude', 'Longitude'));
      if (lat === null || lng === null) return [];

      const locationId = col(row, 'location_id', 'Location ID');
      const name =
        col(row, 'School Name', 'school_name', 'Name', 'name') ||
        'Unnamed School';

      return [
        {
          id: `school_${locationId || i + 1}`,
          layer_type: 'day_school' as const,
          name,
          country: col(row, 'Country', 'country', 'Country/Region'),
          state_province: col(row, 'state_province', 'State/Province', 'State'),
          city: cleanCity(col(row, 'city', 'City')),
          metro_area: col(row, 'metro_area', 'Metro Area') || undefined,
          latitude: lat,
          longitude: lng,
          affiliation: col(row, 'affiliation', 'Affiliation') || undefined,
          notes: col(row, 'notes', 'Notes') || undefined,
          raw: row,
        },
      ];
    });
  } catch (err) {
    console.error('[Day Schools] falling back to sample data:', (err as Error).message);
    return SAMPLE_MAP_RECORDS.filter((r) => r.layer_type === 'day_school');
  }
}

export async function fetchHeadShluchim(): Promise<MapRecord[]> {
  try {
    const rows = await fetchRows('Head Shluchim', 'GOOGLE_CSV_HEAD_SHLUCHIM');
    return rows.flatMap((row, i) => {
      const lat = cleanCoord(col(row, 'latitude', 'Latitude'));
      const lng = cleanCoord(col(row, 'longitude', 'Longitude'));
      if (lat === null || lng === null) return [];

      const locationId = col(row, 'location_id', 'Location ID');
      const firstName = col(row, 'First Name', 'first_name', 'firstname');
      const lastName = col(row, 'Last Name', 'last_name', 'lastname');
      const name =
        [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Shliach';

      return [
        {
          id: `shliach_${locationId || i + 1}`,
          layer_type: 'head_shliach' as const,
          name,
          country: col(row, 'country', 'Country', 'Country/Region'),
          state_province: col(row, 'state_province', 'State/Province', 'State'),
          city: cleanCity(col(row, 'city', 'City')),
          metro_area: col(row, 'metro_area', 'Metro Area') || undefined,
          latitude: lat,
          longitude: lng,
          email: col(row, 'Email', 'email') || undefined,
          whatsapp: col(row, 'Whatsapp', 'whatsapp', 'WhatsApp') || undefined,
          notes: col(row, 'Notes', 'notes') || undefined,
          raw: row,
        },
      ];
    });
  } catch (err) {
    console.error('[Head Shluchim] falling back to sample data:', (err as Error).message);
    return SAMPLE_MAP_RECORDS.filter((r) => r.layer_type === 'head_shliach');
  }
}

export async function fetchPopulation(): Promise<MapRecord[]> {
  try {
    const rows = await fetchRows('Jewish Population', 'GOOGLE_CSV_POPULATION');
    return rows.flatMap((row, i) => {
      const lat = cleanCoord(col(row, 'latitude', 'Latitude'));
      const lng = cleanCoord(col(row, 'longitude', 'Longitude'));
      if (lat === null || lng === null) return [];

      const city = cleanCity(
        col(row, 'City', 'city'),
      );
      const state = col(row, 'State/Province', 'state_province', 'State');
      const popStr = col(
        row,
        'Number of Jews',
        'number_of_jews',
        'Population',
        'Jewish Population',
      );
      const population = cleanPopulation(popStr) ?? undefined;

      const idBase = city && state
        ? `${city}_${state}`.replace(/\s+/g, '_').toLowerCase()
        : String(i + 1);

      return [
        {
          id: `population_${idBase}`,
          layer_type: 'population' as const,
          name: city ? `${city} Jewish Population` : 'Jewish Population',
          country: col(row, 'Country/Region', 'country', 'Country'),
          state_province: state,
          city,
          metro_area: col(row, 'metro_area', 'Metro Area') || undefined,
          latitude: lat,
          longitude: lng,
          population,
          notes: col(row, 'notes', 'Notes') || undefined,
          raw: row,
        },
      ];
    });
  } catch (err) {
    console.error('[Population] falling back to sample data:', (err as Error).message);
    return SAMPLE_MAP_RECORDS.filter((r) => r.layer_type === 'population');
  }
}
