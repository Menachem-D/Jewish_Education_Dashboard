'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { MapRecord } from '@/types/map-record';
import type { Region } from '@/lib/regions-data';
import { US_STATES, CA_PROVINCES, recordsInRegion } from '@/lib/regions-data';
import type { GeoCity } from '@/lib/jewish-geo';
import CommandSidebar from '@/components/sidebar/CommandSidebar';
import FamilyMapPanel from '@/components/FamilyMapPanel';
import RegionPanel from '@/components/RegionPanel';
import StatsBar from '@/components/StatsBar';

const DispatchMap = dynamic(() => import('@/components/map/DispatchMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 tracking-wider uppercase">Initializing map</span>
      </div>
    </div>
  ),
});

interface LayerVisibility {
  families:     boolean;
  synagogue:    boolean;
  chabad:       boolean;
  day_school:   boolean;
  head_shliach: boolean;
  choropleth:   boolean;
}

interface GeoStats {
  totalJewishPop:  number;
  totalChildPop:   number;
  totalSynagogues: number;
  totalChabad:     number;
  totalSchools:    number;
  usCityCount:     number;
  caCityCount:     number;
  deserts:         GeoCity[];
  stateMap:        Record<string, { pop: number; schools: number; chabad: number }>;
}

const DEFAULT_LAYERS: LayerVisibility = {
  families:     true,
  synagogue:    false,
  chabad:       false,
  day_school:   false,
  head_shliach: false,
  choropleth:   false,
};

function buildChoroplethData(
  stateMap: Record<string, { pop: number }>,
): Record<string, number> {
  const allRegions = [...US_STATES, ...CA_PROVINCES];
  const out: Record<string, number> = {};
  for (const [abbr, data] of Object.entries(stateMap)) {
    const region = allRegions.find((r) => r.abbr === abbr);
    if (region && data.pop > 0) out[region.name] = data.pop;
  }
  return out;
}

function exportFamiliesToCSV(records: MapRecord[]) {
  const header = 'ID,Name,City,State,Country,Latitude,Longitude,Status';
  const rows = records.map((r) =>
    [r.id, r.name, r.city, r.state_province, r.country, r.latitude, r.longitude, r.affiliation ?? '']
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jewish-dispatch-families-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const [familyRecords, setFamilyRecords] = useState<MapRecord[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [geoMarkers, setGeoMarkers]   = useState<MapRecord[]>([]);
  const [geoStats, setGeoStats]       = useState<GeoStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [layers, setLayers]           = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<MapRecord | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track which institutional types are currently loaded
  const loadedInstTypes = useRef<Set<string>>(new Set());

  // Fetch family pins
  useEffect(() => {
    setLoadingFamilies(true);
    const fetchFamilies = () =>
      fetch('/api/crm/map-families')
        .then((r) => r.json() as Promise<MapRecord[]>)
        .then(setFamilyRecords)
        .catch(() => {})
        .finally(() => setLoadingFamilies(false));

    fetchFamilies();

    fetch('/api/crm/geocode-batch', { method: 'POST' })
      .then((r) => r.json())
      .then(({ geocoded }: { geocoded: number }) => { if (geocoded > 0) fetchFamilies(); })
      .catch(() => {});
  }, []);

  // Fetch aggregate geo stats + coverage deserts
  useEffect(() => {
    setStatsLoading(true);
    fetch('/api/jewish-geo/stats')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoStats>; })
      .then(setGeoStats)
      .catch((e) => setError(e.message))
      .finally(() => setStatsLoading(false));
  }, []);

  // Fetch institutional geo markers when layers turn on
  useEffect(() => {
    const instTypes = ['synagogue', 'chabad', 'day_school', 'head_shliach'] as const;
    const needed = instTypes.filter(
      (t) => (layers as unknown as Record<string, boolean>)[t] && !loadedInstTypes.current.has(t),
    );
    if (needed.length === 0) return;

    const types = [...loadedInstTypes.current, ...needed].join(',');
    fetch(`/api/jewish-geo/markers?types=${types}`)
      .then((r) => r.json() as Promise<MapRecord[]>)
      .then((markers) => {
        setGeoMarkers(markers);
        needed.forEach((t) => loadedInstTypes.current.add(t));
      })
      .catch(() => {});
  }, [layers]);

  // Filtered institutional markers based on layer visibility
  const visibleInstRecords = geoMarkers.filter(
    (r) => (layers as unknown as Record<string, boolean>)[r.layer_type],
  );

  // Family markers shown only when families layer enabled
  const visibleFamilies = layers.families ? familyRecords : [];

  const allRecords: MapRecord[] = [...familyRecords];

  const choroplethData = geoStats
    ? buildChoroplethData(geoStats.stateMap)
    : {};

  const toggleLayer = useCallback((key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleFamilySelect = useCallback((rec: MapRecord) => {
    setSelectedFamily(rec);
    setSelectedRegion(null);
    setFlyToTarget({ lat: rec.latitude, lng: rec.longitude });
  }, []);

  const handleRegionSelect = useCallback((region: Region) => {
    setSelectedRegion(region);
    setSelectedFamily(null);
    setFlyToTarget({ lat: region.lat, lng: region.lng, zoom: region.zoom });
  }, []);

  const handleDesertSelect = useCallback((city: GeoCity) => {
    if (city.lat != null && city.lng != null) {
      setFlyToTarget({ lat: city.lat, lng: city.lng, zoom: 10 });
    }
    // Find matching region and open it
    const allRegions = [...US_STATES, ...CA_PROVINCES];
    const region = allRegions.find((r) => r.abbr === city.state && r.country === city.country);
    if (region) {
      setSelectedRegion(region);
      setSelectedFamily(null);
    }
  }, []);

  const handleExport = useCallback(() => {
    exportFamiliesToCSV(familyRecords);
  }, [familyRecords]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-100 relative">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile until toggled */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-30
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex shrink-0
      `}>
      <CommandSidebar
        familyCount={familyRecords.length}
        allRecords={allRecords}
        onSelectRegion={handleRegionSelect}
        selectedRegionAbbr={selectedRegion?.abbr ?? null}
        loading={loadingFamilies}
        layers={layers}
        onToggleLayer={toggleLayer}
        onExport={handleExport}
        deserts={geoStats?.deserts ?? []}
        onDesertSelect={handleDesertSelect}
      />
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0">
        {/* Executive summary stats strip */}
        <StatsBar
          totalJewishPop={geoStats?.totalJewishPop  ?? 0}
          totalChildPop={geoStats?.totalChildPop    ?? 0}
          totalSynagogues={geoStats?.totalSynagogues ?? 0}
          totalChabad={geoStats?.totalChabad        ?? 0}
          totalSchools={geoStats?.totalSchools       ?? 0}
          usCityCount={geoStats?.usCityCount        ?? 0}
          caCityCount={geoStats?.caCityCount        ?? 0}
          familyCount={familyRecords.length}
          loading={statsLoading}
        />

        <div className="flex-1 relative overflow-hidden">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="md:hidden absolute top-3 left-3 z-10 bg-slate-800/90 border border-slate-700/60 rounded-lg p-2 text-slate-300 hover:text-slate-100 shadow-lg"
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect y="2" width="16" height="2" rx="1" />
              <rect y="7" width="16" height="2" rx="1" />
              <rect y="12" width="16" height="2" rx="1" />
            </svg>
          </button>

          {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-red-900/80 border border-red-700 text-red-200 text-xs px-3 py-1.5 rounded-full shadow-lg">
              Data error: {error}
            </div>
          )}

          <DispatchMap
            records={visibleFamilies}
            instRecords={visibleInstRecords}
            layerVisibility={layers}
            choroplethData={choroplethData}
            onSelectRecord={handleFamilySelect}
            selectedId={selectedFamily?.id ?? null}
            flyToTarget={flyToTarget}
          />

          {selectedRegion ? (
            <RegionPanel
              region={selectedRegion}
              records={recordsInRegion(allRecords, selectedRegion)}
              onClose={() => setSelectedRegion(null)}
            />
          ) : selectedFamily?.layer_type === 'family' && selectedFamily.family_record_id ? (
            <FamilyMapPanel
              key={selectedFamily.id}
              familyId={selectedFamily.family_record_id}
              onClose={() => setSelectedFamily(null)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
