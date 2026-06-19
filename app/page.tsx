'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapRecord, LayerFilters, MapStats } from '@/types/map-record';
import CommandSidebar from '@/components/sidebar/CommandSidebar';
import DetailPanel from '@/components/DetailPanel';
import FamilyMapPanel from '@/components/FamilyMapPanel';

const DispatchMap = dynamic(() => import('@/components/map/DispatchMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 tracking-wider uppercase">
          Initializing map
        </span>
      </div>
    </div>
  ),
});

const DEFAULT_LAYER_FILTERS: LayerFilters = {
  synagogue: true,
  day_school: true,
  head_shliach: true,
  population: true,
  family: false,
};

export default function DashboardPage() {
  const [records, setRecords] = useState<MapRecord[]>([]);
  const [familyRecords, setFamilyRecords] = useState<MapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MapRecord | null>(null);
  const [layerFilters, setLayerFilters] = useState<LayerFilters>(DEFAULT_LAYER_FILTERS);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch('/api/map-records')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MapRecord[]>;
      })
      .then(setRecords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // When the family layer is enabled, fetch geocoded families and trigger background geocoding
  useEffect(() => {
    if (!layerFilters.family) return;

    const fetchFamilies = () =>
      fetch('/api/crm/map-families')
        .then((r) => r.json() as Promise<MapRecord[]>)
        .then(setFamilyRecords)
        .catch(() => {});

    fetchFamilies();

    // Geocode any families missing coordinates; refresh pins if new ones were geocoded
    fetch('/api/crm/geocode-batch', { method: 'POST' })
      .then((r) => r.json())
      .then(({ geocoded }: { geocoded: number }) => {
        if (geocoded > 0) fetchFamilies();
      })
      .catch(() => {});
  }, [layerFilters.family]);

  const visible = records.filter((r) => layerFilters[r.layer_type]);
  const allVisible = layerFilters.family ? [...visible, ...familyRecords] : visible;

  const stats: MapStats = {
    total: records.length,
    visible: visible.length,
    synagogues: records.filter((r) => r.layer_type === 'synagogue').length,
    daySchools: records.filter((r) => r.layer_type === 'day_school').length,
    headShluchim: records.filter((r) => r.layer_type === 'head_shliach').length,
    populationCities: records.filter((r) => r.layer_type === 'population').length,
  };

  const handleSelect = useCallback((rec: MapRecord) => {
    setSelectedRecord(rec);
    setFlyToTarget({ lat: rec.latitude, lng: rec.longitude });
  }, []);

  const handleClose = useCallback(() => setSelectedRecord(null), []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-100">
      <CommandSidebar
        stats={stats}
        layerFilters={layerFilters}
        onLayerFiltersChange={setLayerFilters}
        records={allVisible}
        onSelectRecord={handleSelect}
        selectedId={selectedRecord?.id}
        loading={loading}
      />

      <div className="flex-1 relative overflow-hidden">
        {error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-red-900/80 border border-red-700 text-red-200 text-xs px-3 py-1.5 rounded-full shadow-lg">
            Data error: {error}
          </div>
        )}

        <DispatchMap
          records={allVisible}
          onSelectRecord={handleSelect}
          selectedId={selectedRecord?.id}
          flyToTarget={flyToTarget}
        />

        {selectedRecord?.layer_type === 'family' && selectedRecord.family_record_id ? (
          <FamilyMapPanel
            key={selectedRecord.id}
            familyId={selectedRecord.family_record_id}
            onClose={handleClose}
          />
        ) : selectedRecord ? (
          <DetailPanel record={selectedRecord} onClose={handleClose} />
        ) : null}
      </div>
    </div>
  );
}
