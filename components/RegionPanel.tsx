'use client';

import { X, Globe, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

function FbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.254h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}
import { useState, useEffect } from 'react';
import type { MapRecord } from '@/types/map-record';
import type { Region } from '@/lib/regions-data';
import { LAYER_COLORS } from '@/types/map-record';
import type { GeoCity } from '@/lib/jewish-geo';

// ── Helpers ───────────────────────────────────────────────────────────────────

function openPopup(url: string) {
  const w = 1100, h = 720;
  const left = Math.max(0, (window.screen.width  - w) / 2);
  const top  = Math.max(0, (window.screen.height - h) / 2);
  window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes,location=yes`);
}

function fbUrl(city: string) {
  return `https://www.facebook.com/search/top/?q=${encodeURIComponent(`jewish ${city}`)}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CityData {
  shluchim:   MapRecord[];
  synagogues: MapRecord[];
  schools:    MapRecord[];
  population: MapRecord[];
  families:   MapRecord[];
  geo?:       GeoCity; // static reference data
}

function groupByCity(records: MapRecord[], geoByCity: Map<string, GeoCity>): Map<string, CityData> {
  const map = new Map<string, CityData>();
  const empty = (): CityData => ({ shluchim: [], synagogues: [], schools: [], population: [], families: [] });

  // Seed with any city from geo data so we always show known cities
  for (const [city, geo] of geoByCity) {
    if (!map.has(city)) map.set(city, empty());
    map.get(city)!.geo = geo;
  }

  for (const r of records) {
    const city = r.city?.trim() || 'Other';
    if (!map.has(city)) map.set(city, empty());
    const entry = map.get(city)!;
    switch (r.layer_type) {
      case 'head_shliach': entry.shluchim.push(r);   break;
      case 'synagogue':    entry.synagogues.push(r);  break;
      case 'day_school':   entry.schools.push(r);     break;
      case 'population':   entry.population.push(r);  break;
      case 'family':       entry.families.push(r);    break;
    }
  }

  // Sort: cities with more data first
  return new Map(
    [...map.entries()].sort((a, b) => {
      const score = (d: CityData) =>
        d.shluchim.length * 5 +
        d.synagogues.length * 3 +
        d.schools.length * 3 +
        d.families.length +
        (d.geo ? 1 : 0);
      return score(b[1]) - score(a[1]);
    }),
  );
}

// ── City card ─────────────────────────────────────────────────────────────────

function Placeholder({ label }: { label: string }) {
  return <span className="text-[10px] text-slate-700 italic">{label}</span>;
}

function CityCard({ city, data }: { city: string; data: CityData }) {
  const [open, setOpen] = useState(false); // collapsed by default

  const geo         = data.geo;
  const jewishPop   = data.population[0]?.population ?? geo?.jewish_population ?? null;
  const kidPop      = geo?.jewish_child_population ?? null;
  const penetration = geo?.market_penetration_est ?? null;
  const allSyns     = [...data.synagogues.map((r) => r.name), ...(geo?.synagogues ?? [])];
  const uniqSyns    = [...new Set(allSyns)];
  const uniqChabad  = [...new Set(geo?.chabad_houses ?? [])];
  const allSchools  = [...data.schools.map((r) => r.name), ...(geo?.day_schools ?? [])];
  const uniqSchools = [...new Set(allSchools)];

  // Summary badges for collapsed header
  const badges = [
    data.shluchim.length > 0  && { label: 'Shliach',                              color: LAYER_COLORS.head_shliach },
    uniqSyns.length > 0       && { label: `${uniqSyns.length} Syn.`,              color: LAYER_COLORS.synagogue },
    uniqChabad.length > 0     && { label: `${uniqChabad.length} Chabad`,           color: LAYER_COLORS.chabad },
    uniqSchools.length > 0    && { label: `${uniqSchools.length} School`,          color: LAYER_COLORS.day_school },
    penetration != null       && { label: `${penetration}% enrolled`,              color: '#A78BFA' },
    jewishPop != null         && { label: `${(jewishPop / 1000).toFixed(0)}k Jews`, color: LAYER_COLORS.population },
    data.families.length > 0  && { label: `${data.families.length} fam.`,         color: LAYER_COLORS.family },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      {/* Header — always visible */}
      <div className="flex items-stretch">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-900/50 hover:bg-slate-900/70 transition-colors text-left"
        >
          {open
            ? <ChevronDown  className="w-3 h-3 text-slate-600 shrink-0" />
            : <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          }
          <span className="text-xs font-semibold text-slate-200 flex-1 truncate">{city}</span>
          <div className="flex items-center gap-1 flex-wrap">
            {badges.map((b) => (
              <span
                key={b.label}
                className="text-[9px] px-1 py-0.5 rounded shrink-0"
                style={{ backgroundColor: `${b.color}20`, color: b.color }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </button>

        {/* Facebook popup button */}
        <button
          onClick={() => openPopup(fbUrl(city))}
          title={`Jewish ${city} on Facebook`}
          className="px-2.5 bg-slate-900/50 hover:bg-[#1877F2]/20 border-l border-slate-700/40 transition-colors shrink-0"
        >
          <FbIcon className="w-3 h-3 text-[#1877F2]" />
        </button>
      </div>

      {/* Body — expanded */}
      {open && (
        <div className="px-3 py-2.5 space-y-2.5 bg-slate-800/30 text-xs">

          {/* Synagogues */}
          <div>
            <span style={{ color: LAYER_COLORS.synagogue }} className="font-medium text-[10px] uppercase tracking-wider">
              Synagogues {uniqSyns.length > 0 && `(${uniqSyns.length})`}
            </span>
            <ul className="mt-0.5 space-y-0.5 pl-2">
              {uniqSyns.length > 0 ? (
                uniqSyns.map((name) => (
                  <li key={name} className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: LAYER_COLORS.synagogue }} />
                    {name}
                  </li>
                ))
              ) : (
                <li><Placeholder label="No synagogues on record" /></li>
              )}
            </ul>
          </div>

          {/* Chabad Houses */}
          {uniqChabad.length > 0 && (
            <div>
              <span style={{ color: LAYER_COLORS.chabad }} className="font-medium text-[10px] uppercase tracking-wider">
                Chabad Houses ({uniqChabad.length})
              </span>
              <ul className="mt-0.5 space-y-0.5 pl-2">
                {uniqChabad.map((name) => (
                  <li key={name} className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: LAYER_COLORS.chabad }} />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Day Schools */}
          <div>
            <span style={{ color: LAYER_COLORS.day_school }} className="font-medium text-[10px] uppercase tracking-wider">
              Day Schools {uniqSchools.length > 0 && `(${uniqSchools.length})`}
            </span>
            <ul className="mt-0.5 space-y-0.5 pl-2">
              {uniqSchools.length > 0 ? (
                uniqSchools.map((name) => (
                  <li key={name} className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: LAYER_COLORS.day_school }} />
                    {name}
                  </li>
                ))
              ) : (
                <li><Placeholder label="No day schools on record" /></li>
              )}
            </ul>
          </div>

          {/* Jewish Population + Market Penetration */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-slate-900/50 rounded px-2 py-1.5">
              <div className="text-[9px] text-slate-600 uppercase tracking-wider">Jewish Pop.</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: LAYER_COLORS.population }}>
                {jewishPop != null
                  ? jewishPop >= 1000
                    ? `${(jewishPop / 1000).toFixed(0)}k`
                    : jewishPop.toLocaleString()
                  : <span className="text-slate-700 text-xs font-normal">unknown</span>
                }
              </div>
            </div>
            <div className="bg-slate-900/50 rounded px-2 py-1.5">
              <div className="text-[9px] text-slate-600 uppercase tracking-wider">Jewish Kids</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: '#A78BFA' }}>
                {kidPop != null
                  ? kidPop >= 1000
                    ? `${(kidPop / 1000).toFixed(0)}k`
                    : kidPop.toLocaleString()
                  : <span className="text-slate-700 text-xs font-normal">unknown</span>
                }
              </div>
            </div>
          </div>

          {/* Market Penetration */}
          {penetration != null && kidPop != null && (
            <div className="bg-slate-900/50 rounded px-2 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-slate-600 uppercase tracking-wider">Day School Enrollment (est.)</span>
                <span className="text-xs font-bold" style={{ color: penetration >= 50 ? '#22C55E' : penetration >= 25 ? '#F59E0B' : '#EF4444' }}>
                  ~{penetration}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, penetration)}%`,
                    backgroundColor: penetration >= 50 ? '#22C55E' : penetration >= 25 ? '#F59E0B' : '#EF4444',
                  }}
                />
              </div>
            </div>
          )}

          {/* CRM families */}
          {data.families.length > 0 && (
            <div className="text-[10px] text-slate-600">
              <span style={{ color: LAYER_COLORS.family }}>{data.families.length}</span> CRM {data.families.length === 1 ? 'family' : 'families'} in this city
            </div>
          )}

          {/* Study links */}
          {geo?.study_links && geo.study_links.length > 0 && (
            <div className="border-t border-slate-700/40 pt-2 space-y-1">
              {geo.study_links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  {link.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface RegionPanelProps {
  region:  Region;
  records: MapRecord[];
  onClose: () => void;
}

export default function RegionPanel({ region, records, onClose }: RegionPanelProps) {
  const [geoByCity, setGeoByCity] = useState<Map<string, GeoCity>>(new Map());

  // Load static geo data for this state
  useEffect(() => {
    fetch(`/api/jewish-geo?state=${region.abbr}&country=${region.country}`)
      .then((r) => r.json())
      .then((cities: GeoCity[]) => {
        const m = new Map<string, GeoCity>();
        for (const c of cities) m.set(c.city, c);
        setGeoByCity(m);
      })
      .catch(() => {});
  }, [region.abbr, region.country]);

  const byCity = groupByCity(records, geoByCity);

  // State-level head shluchim (they reside in a city but represent the whole state)
  const stateShluchim = records.filter((r) => r.layer_type === 'head_shliach');

  const totals = {
    shluchim:   stateShluchim.length,
    synagogues: [...new Set([
      ...records.filter((r) => r.layer_type === 'synagogue').map((r) => r.name),
      ...[...geoByCity.values()].flatMap((g) => g.synagogues),
    ])].length,
    schools: [...new Set([
      ...records.filter((r) => r.layer_type === 'day_school').map((r) => r.name),
      ...[...geoByCity.values()].flatMap((g) => g.day_schools),
    ])].length,
    families: records.filter((r) => r.layer_type === 'family').length,
    pop: [
      ...records.filter((r) => r.layer_type === 'population').map((r) => r.population ?? 0),
      ...[...geoByCity.values()].map((g) => g.jewish_population ?? 0),
    ].reduce((a, b) => a + b, 0),
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden crm-panel-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-950/40 border-b border-blue-800/30">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-100">{region.name}</span>
          <span className="text-[10px] text-slate-500">
            {region.abbr} · {region.country === 'US' ? 'US' : 'Canada'}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors ml-2 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[82vh] overflow-y-auto">
        {/* Summary strip */}
        <div className="grid grid-cols-5 divide-x divide-slate-700/40 border-b border-slate-700/40">
          {[
            { label: 'Shluchim', value: totals.shluchim,   color: LAYER_COLORS.head_shliach },
            { label: 'Synag.',   value: totals.synagogues, color: LAYER_COLORS.synagogue },
            { label: 'Schools',  value: totals.schools,    color: LAYER_COLORS.day_school },
            { label: 'Families', value: totals.families,   color: LAYER_COLORS.family },
            {
              label: 'Pop.',
              value: totals.pop > 0
                ? totals.pop >= 1000000
                  ? `${(totals.pop / 1000000).toFixed(1)}M`
                  : `${Math.round(totals.pop / 1000)}k`
                : '—',
              color: LAYER_COLORS.population,
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center py-2">
              <span className="text-sm font-bold leading-none" style={{ color }}>{value}</span>
              <span className="text-[8px] text-slate-600 uppercase tracking-wider mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* State-level Head Shluchim */}
        <div className="px-3 pt-3 pb-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: LAYER_COLORS.head_shliach }}>
            Head Shliach — {region.name}
          </div>
          {region.headShliach ? (
            <div className="text-xs text-slate-300 flex items-center gap-2 bg-slate-900/40 rounded px-2 py-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: LAYER_COLORS.head_shliach }} />
              <span className="flex-1">{region.headShliach}</span>
              <span className="text-[9px] text-slate-600">Head Shliach</span>
            </div>
          ) : stateShluchim.length > 0 ? (
            stateShluchim.map((r) => (
              <div key={r.id} className="text-xs text-slate-300 flex items-center gap-2 bg-slate-900/40 rounded px-2 py-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: LAYER_COLORS.head_shliach }} />
                <span className="flex-1">{r.name}</span>
                {r.city && <span className="text-slate-600 text-[10px]">{r.city}</span>}
                {r.email && (
                  <a href={`mailto:${r.email}`} className="text-[10px] text-slate-600 hover:text-slate-400">✉</a>
                )}
              </div>
            ))
          ) : (
            <div className="text-[10px] text-slate-700 italic bg-slate-900/30 rounded px-2 py-1.5">
              No head shliach on record for {region.name}
            </div>
          )}
        </div>

        <div className="h-px bg-slate-700/40 mx-3 mb-2 mt-1" />

        {/* Cities */}
        <div className="px-3 pb-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Cities ({byCity.size})
          </div>
          {byCity.size === 0 ? (
            <div className="py-4 text-center">
              <div className="text-xs text-slate-600">No city data for {region.name} yet.</div>
            </div>
          ) : (
            [...byCity.entries()].map(([city, data]) => (
              <CityCard key={city} city={city} data={data} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
