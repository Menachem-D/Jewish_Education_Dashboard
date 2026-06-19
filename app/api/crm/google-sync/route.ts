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

/** POST — syncs contacts from a given contact group into the CRM */
export async function POST(request: Request) {
  const { resourceName } = await request.json();
  if (!resourceName) return Response.json({ error: 'resourceName required' }, { status: 400 });

  const client = await getAuthedClient();
  if (!client) return Response.json({ error: 'Not connected' }, { status: 401 });

  const people = google.people({ version: 'v1', auth: client });

  // 1. Get member resource names from the group (up to 1000)
  const groupRes = await people.contactGroups.get({ resourceName, maxMembers: 1000 });
  const memberNames = groupRes.data.memberResourceNames ?? [];
  if (memberNames.length === 0) return Response.json({ created: 0, updated: 0, skipped: 0 });

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

  // 3. Sync each contact into the CRM
  let created = 0, updated = 0, skipped = 0;

  for (const person of contacts) {
    const mapped = mapPerson(person);
    if (!mapped.family_name) { skipped++; continue; }

    // Match by email or phone to detect existing family
    const existing = db.listFamilies({}).find(
      (f) =>
        (mapped.email && f.email && f.email.toLowerCase() === mapped.email.toLowerCase()) ||
        (mapped.phone &&
          f.phone &&
          f.phone.replace(/\D/g, '') === mapped.phone.replace(/\D/g, '') &&
          mapped.phone.replace(/\D/g, '').length >= 7),
    );

    if (existing) {
      // Patch only null/empty fields — never overwrite existing data
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(mapped) as [string, string | null][]) {
        if (v != null && v !== '' && (existing as unknown as Record<string, unknown>)[k] == null) {
          patch[k] = v;
        }
      }
      if (Object.keys(patch).length > 0) {
        db.updateFamily(existing.id, patch);
        updated++;
      } else {
        skipped++;
      }
    } else {
      db.createFamily(mapped);
      created++;
    }
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

  // Try to detect spouse from relations or multiple names
  let fatherFirst: string | null = givenName;
  let motherFirst: string | null = null;
  const spouseRelation = p.relations?.find(
    (r) => r.person && ['spouse', 'wife', 'husband', 'partner'].includes((r.type ?? '').toLowerCase()),
  );
  if (spouseRelation?.person) motherFirst = spouseRelation.person.trim() || null;

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
