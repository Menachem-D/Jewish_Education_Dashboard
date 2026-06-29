import { google, people_v1 } from 'googleapis';
import { getAuthedClient, loadTokens, clearTokens } from '@/lib/google-auth';
import * as db from '@/lib/crm-db';

/** GET — returns connection status + list of contact group labels */
export async function GET() {
  const tokens = loadTokens();
  if (!tokens) return Response.json({ connected: false });

  const client = await getAuthedClient();
  if (!client) return Response.json({ connected: false });

  try {
    const people = google.people({ version: 'v1', auth: client });
    const res = await people.contactGroups.list({ pageSize: 100 });
    const groups = (res.data.contactGroups ?? [])
      .filter((g) => g.groupType === 'USER_CONTACT_GROUP')
      .map((g) => ({ name: g.name ?? '', resourceName: g.resourceName ?? '', memberCount: g.memberCount ?? 0 }));

    return Response.json({ connected: true, groups });
  } catch {
    clearTokens();
    return Response.json({ connected: false });
  }
}

export interface PreviewRow {
  action: 'create' | 'update' | 'skip';
  family_name: string;
  father_first_name: string | null;
  mother_first_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state_province: string | null;
  // only present for 'update'
  existing_id?: string;
  patch?: Record<string, string>;
  skip_reason?: string;
}

/** POST — preview (dry_run=true) or commit sync from a given contact group */
export async function POST(request: Request) {
  const body = await request.json() as { resourceName: string; dry_run?: boolean };
  const { resourceName, dry_run = false } = body;
  if (!resourceName) return Response.json({ error: 'resourceName required' }, { status: 400 });

  const client = await getAuthedClient();
  if (!client) return Response.json({ error: 'Not connected' }, { status: 401 });

  const people = google.people({ version: 'v1', auth: client });

  // 1. Get member resource names from the group (up to 1000)
  const groupRes = await people.contactGroups.get({ resourceName, maxMembers: 1000 });
  const memberNames = groupRes.data.memberResourceNames ?? [];
  if (memberNames.length === 0) {
    return Response.json(
      dry_run
        ? { preview: [], total: 0 }
        : { created: 0, updated: 0, skipped: 0, total: 0 },
    );
  }

  // 2. Batch-fetch person details (People API max 200 per request)
  const personFields = 'names,emailAddresses,phoneNumbers,addresses,biographies,organizations,relations';
  const chunks: string[][] = [];
  for (let i = 0; i < memberNames.length; i += 200) {
    chunks.push(memberNames.slice(i, i + 200));
  }

  const contacts: people_v1.Schema$Person[] = [];
  for (const chunk of chunks) {
    const res = await people.people.getBatchGet({ resourceNames: chunk, personFields });
    for (const r of res.data.responses ?? []) {
      if (r.person) contacts.push(r.person);
    }
  }

  // 3. Plan what each contact would do
  const allFamilies = db.listFamilies({});
  const preview: PreviewRow[] = [];
  let created = 0, updated = 0, skipped = 0;

  for (const person of contacts) {
    const mapped = mapPerson(person);

    if (!mapped.family_name) {
      preview.push({ action: 'skip', family_name: '(unnamed)', father_first_name: null, mother_first_name: null, email: mapped.email, phone: mapped.phone, city: null, state_province: null, skip_reason: 'No family name' });
      skipped++;
      continue;
    }

    const existing = allFamilies.find(
      (f) =>
        (mapped.email && f.email && f.email.toLowerCase() === mapped.email.toLowerCase()) ||
        (mapped.phone &&
          f.phone &&
          f.phone.replace(/\D/g, '') === mapped.phone.replace(/\D/g, '') &&
          mapped.phone.replace(/\D/g, '').length >= 7),
    );

    if (existing) {
      const patch: Record<string, string> = {};
      for (const [k, v] of Object.entries(mapped) as [string, string | null][]) {
        if (v != null && v !== '' && (existing as unknown as Record<string, unknown>)[k] == null) {
          patch[k] = v;
        }
      }
      if (Object.keys(patch).length > 0) {
        preview.push({ action: 'update', family_name: existing.family_name, father_first_name: existing.father_first_name, mother_first_name: existing.mother_first_name, email: existing.email, phone: existing.phone, city: existing.city, state_province: existing.state_province, existing_id: existing.id, patch });
        if (!dry_run) db.updateFamily(existing.id, patch);
        updated++;
      } else {
        preview.push({ action: 'skip', family_name: existing.family_name, father_first_name: existing.father_first_name, mother_first_name: existing.mother_first_name, email: existing.email, phone: existing.phone, city: existing.city, state_province: existing.state_province, skip_reason: 'Already up to date' });
        skipped++;
      }
    } else {
      preview.push({ action: 'create', family_name: mapped.family_name!, father_first_name: mapped.father_first_name ?? null, mother_first_name: mapped.mother_first_name ?? null, email: mapped.email ?? null, phone: mapped.phone ?? null, city: mapped.city ?? null, state_province: mapped.state_province ?? null });
      if (!dry_run) db.createFamily(mapped);
      created++;
    }
  }

  if (dry_run) {
    return Response.json({ preview, total: contacts.length, created, updated, skipped });
  }
  return Response.json({ created, updated, skipped, total: contacts.length });
}

/** DELETE — disconnects Google (removes stored tokens) */
export async function DELETE() {
  clearTokens();
  return new Response(null, { status: 204 });
}

// ── Field mapping ─────────────────────────────────────────────────────────────

function mapPerson(p: people_v1.Schema$Person): Record<string, string | null> {
  const primaryName = p.names?.[0];
  const familyName = primaryName?.familyName?.trim() ?? '';
  const givenName = primaryName?.givenName?.trim() ?? null;

  // Treat the primary contact name as the mother; spouse relation (if present) becomes father
  let motherFirst: string | null = givenName;
  let fatherFirst: string | null = null;
  const spouseRelation = p.relations?.find(
    (r) => r.person && ['spouse', 'wife', 'husband', 'partner'].includes((r.type ?? '').toLowerCase()),
  );
  if (spouseRelation?.person) fatherFirst = spouseRelation.person.trim() || null;

  const addr = p.addresses?.[0];

  return {
    family_name: familyName || null,
    father_first_name: fatherFirst,
    mother_first_name: motherFirst,
    email: p.emailAddresses?.[0]?.value?.trim() ?? null,
    phone: p.phoneNumbers?.[0]?.value?.trim() ?? null,
    city: addr?.city?.trim() ?? null,
    state_province: addr?.region?.trim() ?? null,
    country: addr?.country?.trim() ?? null,
    notes: p.biographies?.[0]?.value?.trim() ?? null,
  };
}
