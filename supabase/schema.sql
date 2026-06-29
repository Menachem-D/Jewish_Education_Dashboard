-- ============================================================
-- Jewish Dispatch Map — Supabase / PostgreSQL Schema
-- ============================================================
-- Scale tiers this schema is designed for:
--
--   Tier 1 (now → ~10K families):   Supabase Free (500 MB, 50K MAU)
--   Tier 2 (~10K → 100K families):  Supabase Pro ($25/mo) — enable realtime
--   Tier 3 (100K → 1M+ kids):       Supabase Pro + PgBouncer pool + PostGIS
--
-- To activate: set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
-- in .env.local, then run this file once in the Supabase SQL editor.
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy search / similarity
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- uuid_generate_v4()
-- Uncomment when on Pro (needed for geo queries at scale):
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ── Families ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS families (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name       TEXT        NOT NULL,
  father_first_name TEXT,
  mother_first_name TEXT,
  email             TEXT,
  phone             TEXT,
  city              TEXT,
  state_province    TEXT,
  country           TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  program           TEXT,
  status            TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'prospect')),
  enrollment_date   DATE,
  jewish_lineage    TEXT
                    CHECK (jewish_lineage IN ('Bnei Noach', 'Convert', 'Maternal', 'Paternal')),
  affiliation       TEXT,
  notes             TEXT,
  facebook_url      TEXT,
  labels            TEXT[]      NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Full-text search vector (auto-updated via trigger below)
  search_vector     TSVECTOR
);

-- Full-text search index (GIN is fast for @@ queries)
CREATE INDEX IF NOT EXISTS idx_families_search
  ON families USING GIN (search_vector);

-- Trigram index for ILIKE / similarity() queries on family name
CREATE INDEX IF NOT EXISTS idx_families_name_trgm
  ON families USING GIN (family_name gin_trgm_ops);

-- Geo bounding-box queries (cheap range scans on sorted data)
-- Upgrade to PostGIS spatial index at Tier 3
CREATE INDEX IF NOT EXISTS idx_families_lat  ON families (latitude)  WHERE latitude  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_families_lng  ON families (longitude) WHERE longitude IS NOT NULL;

-- Common filter columns
CREATE INDEX IF NOT EXISTS idx_families_status     ON families (status);
CREATE INDEX IF NOT EXISTS idx_families_labels     ON families USING GIN (labels);
CREATE INDEX IF NOT EXISTS idx_families_created_at ON families (created_at DESC);

-- Auto-update search_vector when family rows change
CREATE OR REPLACE FUNCTION families_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.family_name,       '') || ' ' ||
    coalesce(NEW.father_first_name, '') || ' ' ||
    coalesce(NEW.mother_first_name, '') || ' ' ||
    coalesce(NEW.city,              '') || ' ' ||
    coalesce(NEW.email,             '') || ' ' ||
    coalesce(NEW.state_province,    '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER families_search_vector_trigger
  BEFORE INSERT OR UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION families_search_vector_update();

-- ── Children ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS children (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID        NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  first_name       TEXT        NOT NULL,
  birthday         DATE,
  birth_year       INTEGER,
  gender           TEXT        CHECK (gender IN ('male', 'female', 'other')),
  bar_mitzvah_parsha TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_children_family_id ON children (family_id);
CREATE INDEX IF NOT EXISTS idx_children_birthday  ON children (birthday) WHERE birthday IS NOT NULL;

-- ── Dismissed duplicates ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dismissed_duplicates (
  id1          UUID        NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  id2          UUID        NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id1, id2),
  CHECK (id1 < id2)   -- enforce canonical ordering so (a,b) and (b,a) are the same row
);

-- ── Products (Store) ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  sku            TEXT        UNIQUE,
  description    TEXT,
  category       TEXT        NOT NULL DEFAULT 'other'
                 CHECK (category IN ('workbook', 'book', 'kit', 'digital', 'other')),
  price_cents    INTEGER     NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  stock_quantity INTEGER     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category  ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);
-- Low-stock alert query helper
CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products (stock_quantity) WHERE is_active = true AND stock_quantity <= 5;

-- ── Orders (Store) ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID        REFERENCES families (id) ON DELETE SET NULL,
  family_name      TEXT,           -- denormalized snapshot for display
  order_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  status           TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'fulfilled', 'cancelled', 'returned')),
  total_cents      INTEGER     NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  shipping_address TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_family_id  ON orders (family_id) WHERE family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders (order_date DESC);

-- ── Order Items (Store) ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL REFERENCES orders   (id) ON DELETE CASCADE,
  product_id       UUID        NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  product_name     TEXT        NOT NULL,   -- snapshot at order time
  quantity         INTEGER     NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER     NOT NULL CHECK (unit_price_cents >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- ── Row Level Security (RLS) ──────────────────────────────────────────────────
-- Enable when you add user auth. Currently open for service-role key access only.
-- ALTER TABLE families ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE children ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "org members can read" ON families FOR SELECT USING (auth.role() = 'authenticated');

-- ── Tier 3 PostGIS upgrade (uncomment when ready) ────────────────────────────
-- ALTER TABLE families ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)
--   GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;
-- CREATE INDEX idx_families_geom ON families USING GIST (geom);
-- Then replace bounding-box queries with ST_DWithin() for radius search.
