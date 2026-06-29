'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Users, Globe, Search, Download, AlertTriangle, Layers, Map } from 'lucide-react';
import type { MapRecord } from '@/types/map-record';
import { LAYER_COLORS } from '@/types/map-record';
import type { Region } from '@/lib/regions-data';
import { US_STATES, CA_PROVINCES, recordsInRegion } from '@/lib/regions-data';
import type { GeoCity } from '@/lib/jewish-geo';
import { cn } from '@/lib/utils';

interface LayerVisibility {
  families:     boolean;
  synagogue:    boolean;
  chabad:       boolean;
  day_school:   boolean;
  head_shliach: boolean;
  choropleth:   boolean;
}

interface CommandSidebarProps {
  familyCount:         number;
  allRecords:          MapRecord[];
  onSelectRegion:      (region: Region) => void;
  selectedRegionAbbr?: string | null;
  loading:             boolean;
  layers:              LayerVisibility;
  onToggleLayer:       (key: keyof LayerVisibility) => void;
  onExport:            () => void;
  deserts:             GeoCity[];
  onDesertSelect:      (city: GeoCity) => void;
}

// ── Region row ──────────────────────────────────────────────────────────────

function RegionRow({
  region, count, isSelected, onClick,
}: {
  region: Region; count: number; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition-all border',
        isSelected
          ? 'bg-blue-900/30 border-blue-500/40 ring-1 ring-blue-500/20 text-slate-100'
          : count > 0
          ? 'border-transparent hover:bg-slate-900/50 hover:border-slate-700/40 text-slate-300'
          : 'border-transparent text-slate-600 hover:text-slate-500',
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 transition-all"
        style={{
          backgroundColor: count > 0 ? (isSelected ? '#60A5FA' : '#475569') : '#2D3748',
          boxShadow: isSelected ? '0 0 5px #60A5FA' : 'none',
        }}
      />
      <span className="flex-1 text-left truncate font-medium">{region.name}</span>
      <span className="text-[10px] text-slate-600 shrink-0">{region.abbr}</span>
      {count > 0 && (
        <span className="text-[10px] text-blue-400 tabular-nums font-semibold ml-0.5">{count}</span>
      )}
    </button>
  );
}

// ── Layer toggle row ────────────────────────────────────────────────────────

function LayerRow({
  label, colorKey, active, onToggle, count,
}: {
  label: string; colorKey: string; active: boolean; onToggle: () => void; count?: number;
}) {
  const color = LAYER_COLORS[colorKey] ?? '#94A3B8';
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition-all border',
        active
          ? 'border-transparent hover:bg-slate-900/40'
          : 'border-transparent opacity-40 hover:opacity-60',
      )}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 transition-all border"
        style={{
          backgroundColor: active ? color : 'transparent',
          borderColor: color,
          boxShadow: active ? `0 0 6px ${color}60` : 'none',
        }}
      />
      <span className="flex-1 text-left text-slate-300">{label}</span>
      {count !== undefined && (
        <span className="text-[10px] tabular-nums" style={{ color: active ? color : '#475569' }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function CommandSidebar({
  familyCount,
  allRecords,
  onSelectRegion,
  selectedRegionAbbr,
  loading,
  layers,
  onToggleLayer,
  onExport,
  deserts,
  onDesertSelect,
}: CommandSidebarProps) {
  const [usOpen,      setUsOpen]      = useState(true);
  const [caOpen,      setCaOpen]      = useState(false);
  const [gapsOpen,    setGapsOpen]    = useState(false);
  const [layersOpen,  setLayersOpen]  = useState(true);
  const [search,      setSearch]      = useState('');

  function countForRegion(region: Region) {
    return recordsInRegion(allRecords, region).length;
  }

  const sortedStates    = useMemo(() => [...US_STATES].sort((a, b) => countForRegion(b) - countForRegion(a)), [allRecords]);
  const sortedProvinces = useMemo(() => [...CA_PROVINCES].sort((a, b) => countForRegion(b) - countForRegion(a)), [allRecords]);

  const usActive = sortedStates.filter((r)    => countForRegion(r) > 0).length;
  const caActive = sortedProvinces.filter((r) => countForRegion(r) > 0).length;

  const filteredStates = useMemo(() => {
    if (!search.trim()) return sortedStates;
    const q = search.toLowerCase();
    return sortedStates.filter((r) => r.name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q));
  }, [search, sortedStates]);

  const filteredProvinces = useMemo(() => {
    if (!search.trim()) return sortedProvinces;
    const q = search.toLowerCase();
    return sortedProvinces.filter((r) => r.name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q));
  }, [search, sortedProvinces]);

  return (
    <div className="w-72 shrink-0 bg-slate-800 border-r border-slate-700/80 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/80 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <h1 className="text-xs font-bold text-slate-100 tracking-widest uppercase">
            Jewish Education Dispatch
          </h1>
        </div>
        <p className="text-[10px] text-slate-600 pl-4">Command &amp; Intelligence Map</p>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-700/40 shrink-0">
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/50 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search states, provinces…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">

        {/* ── Map Layers ── */}
        <div className="border-b border-slate-700/40">
          <button
            onClick={() => setLayersOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Map Layers
            </span>
            {layersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {layersOpen && (
            <div className="px-2 pb-2 space-y-0.5">
              <LayerRow
                label="Families (CRM)"
                colorKey="family"
                active={layers.families}
                onToggle={() => onToggleLayer('families')}
                count={familyCount}
              />
              <LayerRow
                label="Synagogues"
                colorKey="synagogue"
                active={layers.synagogue}
                onToggle={() => onToggleLayer('synagogue')}
              />
              <LayerRow
                label="Chabad Houses"
                colorKey="chabad"
                active={layers.chabad}
                onToggle={() => onToggleLayer('chabad')}
              />
              <LayerRow
                label="Day Schools"
                colorKey="day_school"
                active={layers.day_school}
                onToggle={() => onToggleLayer('day_school')}
              />
              <LayerRow
                label="Head Shluchim"
                colorKey="head_shliach"
                active={layers.head_shliach}
                onToggle={() => onToggleLayer('head_shliach')}
              />
              {/* Choropleth toggle */}
              <button
                onClick={() => onToggleLayer('choropleth')}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition-all border border-transparent',
                  layers.choropleth ? '' : 'opacity-40 hover:opacity-60',
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded shrink-0 border"
                  style={{
                    background: layers.choropleth
                      ? 'linear-gradient(to right, rgba(59,130,246,0.2), rgba(59,130,246,0.7))'
                      : 'transparent',
                    borderColor: '#3B82F6',
                  }}
                />
                <span className="flex-1 text-left text-slate-300">Population Choropleth</span>
                <Map className="w-3 h-3 text-slate-600" />
              </button>
            </div>
          )}
        </div>

        {/* ── Coverage Deserts ── */}
        {deserts.length > 0 && (
          <div className="border-b border-slate-700/40">
            <button
              onClick={() => setGapsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-widest hover:text-slate-400 transition-colors"
              style={{ color: '#EF4444' }}
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Coverage Gaps
                <span className="ml-1 bg-red-900/40 text-red-400 rounded px-1">{deserts.length}</span>
              </span>
              {gapsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {gapsOpen && (
              <div className="px-2 pb-2 space-y-0.5 max-h-40 overflow-y-auto">
                <div className="text-[9px] text-slate-600 px-1 mb-1">
                  Cities with Jewish children but no day school
                </div>
                {deserts.map((city) => (
                  <button
                    key={`${city.city}-${city.state}`}
                    onClick={() => onDesertSelect(city)}
                    className="w-full flex items-center gap-2 px-2.5 py-1 rounded text-xs hover:bg-red-900/10 border border-transparent hover:border-red-900/30 transition-all text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="flex-1 truncate text-slate-300">{city.city}, {city.state}</span>
                    <span className="text-[9px] text-red-400 tabular-nums shrink-0">
                      {city.jewish_child_population != null
                        ? `${Math.round(city.jewish_child_population / 1000 * 10) / 10}k kids`
                        : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Regions ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Regions
            </span>
          </div>

          {/* United States */}
          <button
            onClick={() => setUsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-400 transition-colors"
          >
            <span>
              United States
              {!search && usActive > 0 && (
                <span className="ml-1.5 text-blue-500">{usActive} active</span>
              )}
            </span>
            {usOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {(usOpen || search) && (
            <div className="px-2 pb-1 space-y-0.5">
              {filteredStates.map((region) => (
                <RegionRow
                  key={region.abbr}
                  region={region}
                  count={countForRegion(region)}
                  isSelected={selectedRegionAbbr === region.abbr}
                  onClick={() => onSelectRegion(region)}
                />
              ))}
              {filteredStates.length === 0 && search && (
                <div className="text-[10px] text-slate-600 px-2.5 py-1">No states match</div>
              )}
            </div>
          )}

          {/* Canada */}
          <button
            onClick={() => setCaOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-400 transition-colors mt-2"
          >
            <span>
              Canada
              {!search && caActive > 0 && (
                <span className="ml-1.5 text-blue-500">{caActive} active</span>
              )}
            </span>
            {caOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {(caOpen || search) && (
            <div className="px-2 pb-3 space-y-0.5">
              {filteredProvinces.map((region) => (
                <RegionRow
                  key={region.abbr}
                  region={region}
                  count={countForRegion(region)}
                  isSelected={selectedRegionAbbr === region.abbr}
                  onClick={() => onSelectRegion(region)}
                />
              ))}
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-700/40 px-3 py-2.5 space-y-2">
        <button
          onClick={onExport}
          className="w-full flex items-center gap-2 text-[10px] text-slate-500 hover:text-green-400 transition-colors group"
        >
          <Download className="w-3.5 h-3.5 group-hover:text-green-400" />
          <span className="uppercase tracking-wider">Export CRM CSV</span>
        </button>
        <Link
          href="/crm"
          className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors group"
        >
          <Users className="w-3.5 h-3.5 group-hover:text-pink-400" />
          <span className="uppercase tracking-wider">Family CRM</span>
        </Link>
      </div>
    </div>
  );
}
