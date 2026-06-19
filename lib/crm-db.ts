/**
 * JSON-file CRM store — zero external dependencies.
 * Data is persisted in data/crm.json alongside the project.
 * Swap the read/save functions for Supabase/Turso when ready to go cloud.
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Family, Child, DuplicatePair } from '@/types/crm';

const DATA_FILE = path.join(process.cwd(), 'data', 'crm.json');

interface Store {
  families: Omit<Family, 'children'>[];
  children: Child[];
  dismissed_duplicates: [string, string][];
}

function read(): Store {
  try {
    if (!fs.existsSync(DATA_FILE)) return { families: [], children: [], dismissed_duplicates: [] };
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Partial<Store>;
    return {
      families: raw.families ?? [],
      children: raw.children ?? [],
      dismissed_duplicates: raw.dismissed_duplicates ?? [],
    };
  } catch {
    return { families: [], children: [], dismissed_duplicates: [] };
  }
}

function save(store: Store): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const content = JSON.stringify(store, null, 2);
  const tmp = `${DATA_FILE}.tmp`;
  try {
    fs.writeFileSync(tmp, content, 'utf-8');
    // Windows requires removing the destination before rename
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    fs.renameSync(tmp, DATA_FILE);
  } catch {
    // Fallback: write directly if rename is blocked
    try { fs.unlinkSync(tmp); } catch { /* ignore cleanup */ }
    fs.writeFileSync(DATA_FILE, content, 'utf-8');
  }
}

// Space-optimised Levenshtein distance
function levenshtein(a: string, b: string): number {
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < n; j++) {
      const val = a[i] === b[j] ? row[j] : 1 + Math.min(prev, row[j], row[j + 1]);
      row[j] = prev;
      prev = val;
    }
    row[n] = prev;
  }
  return row[n];
}

function calcAge(birthday?: string | null, birthYear?: number | null): number | null {
  const now = new Date();
  if (birthday) {
    const b = new Date(birthday);
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }
  if (birthYear != null) return now.getFullYear() - birthYear;
  return null;
}

function withChildren(family: Omit<Family, 'children'>, children: Child[]): Family {
  return { ...family, children: children.filter((c) => c.family_id === family.id) };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function listFamilies(opts: {
  search?: string;
  status?: string;
  child_age?: number;
}): Family[] {
  const { families, children } = read();

  let result = [...families];

  if (opts.search) {
    const s = opts.search.toLowerCase();
    result = result.filter((f) =>
      [f.family_name, f.father_first_name, f.mother_first_name, f.email, f.city].some(
        (v) => v?.toLowerCase().includes(s),
      ),
    );
  }

  if (opts.status) {
    result = result.filter((f) => f.status === opts.status);
  }

  const enriched = result
    .map((f) => withChildren(f, children))
    .sort((a, b) => a.family_name.localeCompare(b.family_name));

  if (opts.child_age !== undefined) {
    const age = opts.child_age;
    return enriched.filter((f) =>
      f.children.some((c) => calcAge(c.birthday, c.birth_year) === age),
    );
  }

  return enriched;
}

export function getFamily(id: string): Family | null {
  const { families, children } = read();
  const family = families.find((f) => f.id === id);
  if (!family) return null;
  return withChildren(family, children);
}

export function createFamily(
  data: Record<string, unknown>,
  childRows?: Record<string, unknown>[],
): Family {
  const store = read();
  const id = randomUUID();
  const now = new Date().toISOString();
  const { children: _c, ...familyData } = data;
  void _c;

  const family = { id, status: 'active', ...familyData, created_at: now } as Omit<Family, 'children'>;
  store.families.push(family);

  const newChildren: Child[] = [];
  for (const c of childRows ?? []) {
    if (!c.first_name) continue;
    const child = { id: randomUUID(), family_id: id, created_at: now, ...c } as Child;
    store.children.push(child);
    newChildren.push(child);
  }

  save(store);
  return { ...family, children: newChildren };
}

export function updateFamily(id: string, data: Record<string, unknown>): Family | null {
  const store = read();
  const idx = store.families.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  const { children: _c, ...fields } = data;
  void _c;
  store.families[idx] = { ...store.families[idx], ...fields } as Omit<Family, 'children'>;
  save(store);
  return withChildren(store.families[idx], store.children);
}

export function deleteFamily(id: string): void {
  const store = read();
  store.families = store.families.filter((f) => f.id !== id);
  store.children = store.children.filter((c) => c.family_id !== id);
  save(store);
}

export function addChild(data: Record<string, unknown>): Child {
  const store = read();
  const child = { id: randomUUID(), created_at: new Date().toISOString(), ...data } as Child;
  store.children.push(child);
  save(store);
  return child;
}

export function updateChild(id: string, data: Record<string, unknown>): Child | null {
  const store = read();
  const idx = store.children.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  store.children[idx] = { ...store.children[idx], ...data } as Child;
  save(store);
  return store.children[idx];
}

export function deleteChild(id: string): void {
  const store = read();
  store.children = store.children.filter((c) => c.id !== id);
  save(store);
}

export function updateFamilyCoords(id: string, lat: number, lng: number): void {
  const store = read();
  const idx = store.families.findIndex((f) => f.id === id);
  if (idx === -1) return;
  store.families[idx] = { ...store.families[idx], latitude: lat, longitude: lng };
  save(store);
}

export function listUngeocodedFamilies(): Omit<Family, 'children'>[] {
  const { families } = read();
  return families.filter(
    (f) =>
      (f.latitude == null || f.longitude == null) &&
      (f.city || f.state_province || f.country),
  );
}

// Single read + single write — fixes the EPERM that happened with 128 individual saves
export function bulkImport(
  rows: { family: Record<string, unknown>; children: Record<string, unknown>[] }[],
) {
  const store = read();
  let created = 0;
  const errors: { row: number; error: string }[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i++) {
    try {
      const { family, children } = rows[i];
      const { children: _c, ...familyData } = family;
      void _c;
      if (!familyData.family_name) throw new Error('family_name is required');

      const id = randomUUID();
      store.families.push({ id, status: 'active', ...familyData, created_at: now } as Omit<Family, 'children'>);

      for (const c of children ?? []) {
        if (!c.first_name) continue;
        store.children.push({ id: randomUUID(), family_id: id, created_at: now, ...c } as Child);
      }
      created++;
    } catch (e: unknown) {
      errors.push({ row: i + 1, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  save(store); // one write for the entire batch
  return { created, errors };
}

// ── Duplicate detection ───────────────────────────────────────────────────────

export function findDuplicates(): DuplicatePair[] {
  const store = read();
  const dismissed = new Set(
    store.dismissed_duplicates.map(([a, b]) => `${a}:${b}`),
  );
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < store.families.length; i++) {
    for (let j = i + 1; j < store.families.length; j++) {
      const f1 = store.families[i];
      const f2 = store.families[j];
      const key = [f1.id, f2.id].sort().join(':');
      if (dismissed.has(key)) continue;

      let score = 0;
      const reasons: string[] = [];

      const n1 = f1.family_name.toLowerCase().trim();
      const n2 = f2.family_name.toLowerCase().trim();
      if (n1 === n2) {
        score += 40;
        reasons.push('Same last name');
      } else if (levenshtein(n1, n2) <= 2) {
        score += 20;
        reasons.push('Similar last name');
      }

      if (f1.email && f2.email && f1.email.toLowerCase() === f2.email.toLowerCase()) {
        score += 50;
        reasons.push('Same email');
      }

      if (f1.phone && f2.phone) {
        const p1 = f1.phone.replace(/\D/g, '');
        const p2 = f2.phone.replace(/\D/g, '');
        if (p1 === p2 && p1.length >= 7) {
          score += 50;
          reasons.push('Same phone');
        }
      }

      if (f1.city && f2.city && f1.city.toLowerCase() === f2.city.toLowerCase()) {
        score += 15;
        reasons.push('Same city');
      }

      if (
        f1.father_first_name &&
        f2.father_first_name &&
        f1.father_first_name.toLowerCase() === f2.father_first_name.toLowerCase()
      ) {
        score += 25;
        reasons.push('Same father name');
      }

      if (score >= 55) {
        pairs.push({
          family1: withChildren(f1, store.children),
          family2: withChildren(f2, store.children),
          score: Math.min(score, 100),
          reasons,
        });
      }
    }
  }

  return pairs.sort((a, b) => b.score - a.score);
}

export function mergeFamilies(keepId: string, removeId: string): Family | null {
  const store = read();
  const keepIdx = store.families.findIndex((f) => f.id === keepId);
  const removeIdx = store.families.findIndex((f) => f.id === removeId);
  if (keepIdx === -1 || removeIdx === -1) return null;

  const keep = { ...store.families[keepIdx] } as Record<string, unknown>;
  const remove = store.families[removeIdx] as Record<string, unknown>;

  // Smart merge: fill empty fields in keep from remove
  for (const key of Object.keys(remove)) {
    if (key === 'id' || key === 'created_at') continue;
    if ((keep[key] == null || keep[key] === '') && remove[key] != null && remove[key] !== '') {
      keep[key] = remove[key];
    }
  }
  store.families[keepIdx] = keep as Omit<Family, 'children'>;

  // Reassign removed family's children to kept family
  store.children = store.children.map((c) =>
    c.family_id === removeId ? { ...c, family_id: keepId } : c,
  );

  // Delete the merged-away family
  store.families = store.families.filter((f) => f.id !== removeId);

  // Clean up dismissed pairs that referenced the removed id
  store.dismissed_duplicates = store.dismissed_duplicates.filter(
    ([a, b]) => a !== removeId && b !== removeId,
  );

  save(store);
  const kept = store.families.find((f) => f.id === keepId);
  return kept ? withChildren(kept, store.children) : null;
}

export function dismissDuplicate(id1: string, id2: string): void {
  const store = read();
  const key = [id1, id2].sort() as [string, string];
  if (!store.dismissed_duplicates.some(([a, b]) => a === key[0] && b === key[1])) {
    store.dismissed_duplicates.push(key);
  }
  save(store);
}
