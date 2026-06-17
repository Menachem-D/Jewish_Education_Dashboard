# Jewish Education Dispatch Map

Internal command-center dashboard for tracking Jewish institutions, education activity, opportunity gaps, and outreach cases on an interactive map.

## What this is

A map-first internal operations tool. Every institution is a pin on the map. The left sidebar lets you filter, view alerts, and browse records. Clicking a pin or record opens a detail panel with full intelligence.

Built with: Next.js 16 · TypeScript · Tailwind CSS v4 · MapLibre GL JS · Supabase

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase (optional)

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

If you skip this step, the app falls back to the local sample data in `lib/sample-data.ts` automatically. The UI works fully without Supabase.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supabase schema

Run this SQL in your Supabase project's SQL editor:

```sql
create table institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  city text,
  state_province text,
  country text,
  latitude float,
  longitude float,
  website_url text,
  facebook_url text,
  youtube_url text,
  education_activity text,
  activity_level text,
  opportunity_score integer default 0,
  status text,
  next_action text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable row level security (required for anon key access)
alter table institutions enable row level security;

-- Allow public read for internal use (add auth policy later)
create policy "Allow read" on institutions for select using (true);
```

---

## Marker colors

| Type        | Color  |
|-------------|--------|
| Synagogue   | Blue   |
| Chabad      | Amber  |
| School      | Green  |
| JCC         | Purple |
| Opportunity | Red    |

Colors are defined in `types/institution.ts` → `MARKER_COLORS` and are easy to change.

---

## Map tile style

The map uses CartoDB's free Dark Matter style (`basemaps.cartocdn.com`). To swap to a different style, edit the `MAP_STYLE` constant in `components/map/DispatchMap.tsx`.

Alternative free styles:
- OpenFreeMap Liberty: `https://tiles.openfreemap.org/styles/liberty`
- OpenFreeMap Positron: `https://tiles.openfreemap.org/styles/positron`

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it on [vercel.com/new](https://vercel.com/new).
3. Add the Supabase env vars in **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

---

## File structure

```
app/
  layout.tsx          Root layout, imports MapLibre CSS + Geist font
  page.tsx            Main dashboard — data fetching + state orchestration
  globals.css         Global styles + MapLibre control overrides

components/
  map/
    DispatchMap.tsx   MapLibre map with custom HTML markers
  sidebar/
    CommandSidebar.tsx  Left panel: filters, alerts, records list
  cards/
    StatsCards.tsx    4 stat cards (total, visible, high opp, needs action)
  DetailPanel.tsx     Right-side institution detail overlay

lib/
  supabase.ts         Supabase client + fetchInstitutions() with fallback
  sample-data.ts      15 sample institutions for offline / demo use
  utils.ts            cn() utility (clsx + tailwind-merge)

types/
  institution.ts      Institution, Filters, Stats interfaces
                      Signal and Case placeholder interfaces (future)
                      MARKER_COLORS, INSTITUTION_TYPES, etc.
```

---

## Future upgrade path

### Authentication
1. Set up Supabase Auth in your project.
2. Wrap the app in a `SessionProvider` (see Supabase Auth docs).
3. Add login page at `app/login/page.tsx`.
4. Update RLS policies on the `institutions` table to require auth.

The app structure is already laid out for this — no breaking changes needed.

### Cases table
The `Case` interface is already defined in `types/institution.ts`. When ready:
1. Create the `cases` table in Supabase (mirror the interface).
2. Add `fetchCases()` to `lib/supabase.ts`.
3. Add a Cases tab or panel to the sidebar.

### Signals table
Same pattern as Cases. The `Signal` interface is in `types/institution.ts`.

### Automation
- Supabase Edge Functions can process signals on a schedule.
- Supabase Realtime can push live updates to the map without polling.
- Add a webhook endpoint at `app/api/signal/route.ts` to receive external signals.
