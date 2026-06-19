'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, List, Users } from 'lucide-react';
import {
  MapRecord,
  LayerFilters,
  MapStats,
  LAYER_COLORS,
  LAYER_LABELS,
  LayerType,
} from '@/types/map-record';
import StatsCards from '@/components/cards/StatsCards';
import { cn } from '@/lib/utils';

interface CommandSidebarProps {
  stats: MapStats;
  layerFilters: LayerFilters;
  onLayerFiltersChange: (filters: LayerFilters) => void;
  records: MapRecord[];
  onSelectRecord: (record: MapRecord) => void;
  selectedId?: string | null;
  loading: boolean;
}

const LAYER_ORDER: LayerType[] = ['synagogue', 'day_school', 'head_shliach', 'population', 'family'];

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300 hover:bg-slate-700/20 transition-colors"
    >
      <div className="flex items-center gap-2">
        <List className="w-3.5 h-3.5" />
        <span>{title}</span>
        {count !== undefined && (
          <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center leading-none">
            {count}
          </span>
        )}
      </div>
      {expanded ? (
        <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronRight className="w-3 h-3" />
      )}
    </button>
  );
}

export default function CommandSidebar({
  stats,
  layerFilters,
  onLayerFiltersChange,
  records,
  onSelectRecord,
  selectedId,
  loading,
}: CommandSidebarProps) {
  const [layersOpen, setLayersOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(true);

  function toggleLayer(key: LayerType) {
    onLayerFiltersChange({ ...layerFilters, [key]: !layerFilters[key] });
  }

  function toggleAll(value: boolean) {
    onLayerFiltersChange({
      synagogue: value,
      day_school: value,
      head_shliach: value,
      population: value,
      family: value,
    });
  }

  const allOn = LAYER_ORDER.every((k) => layerFilters[k]);
  const allOff = LAYER_ORDER.every((k) => !layerFilters[k]);

  // Group visible records by layer for the list
  const byLayer = LAYER_ORDER.reduce<Record<string, MapRecord[]>>((acc, key) => {
    acc[key] = records.filter((r) => r.layer_type === key);
    return acc;
  }, {});

  return (
    <div className="w-80 shrink-0 bg-slate-800 border-r border-slate-700/80 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/80 bg-slate-900/60">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <h1 className="text-xs font-bold text-slate-100 tracking-widest uppercase">
            Jewish Education Dispatch
          </h1>
        </div>
        <p className="text-[10px] text-slate-600 pl-4">Command &amp; Intelligence Map</p>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="h-px bg-slate-700/40" />

        {/* ── Layer toggles ── */}
        <button
          onClick={() => setLayersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300 hover:bg-slate-700/20 transition-colors"
        >
          <span>Layers</span>
          {layersOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {layersOpen && (
          <div className="px-3 pb-3 space-y-1.5">
            {LAYER_ORDER.map((key) => {
              const color = LAYER_COLORS[key];
              const active = layerFilters[key];
              const count = records.filter((r) => r.layer_type === key).length;

              return (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded border text-xs transition-all',
                    active
                      ? 'border-transparent bg-slate-900/60'
                      : 'border-transparent bg-transparent opacity-40 hover:opacity-60',
                  )}
                >
                  {/* Color swatch / toggle indicator */}
                  <span
                    className="w-3 h-3 rounded-full shrink-0 transition-all"
                    style={{
                      backgroundColor: active ? color : '#475569',
                      boxShadow: active ? `0 0 6px ${color}80` : 'none',
                    }}
                  />
                  <span className="text-slate-200 flex-1 text-left font-medium">
                    {LAYER_LABELS[key]}
                  </span>
                  <span className="text-[10px] tabular-nums text-slate-500">
                    {count}
                  </span>
                </button>
              );
            })}

            {/* All on / off */}
            <div className="flex gap-1.5 pt-0.5">
              <button
                onClick={() => toggleAll(true)}
                disabled={allOn}
                className="flex-1 text-[10px] py-1 rounded border border-slate-700/60 text-slate-500 hover:text-slate-300 hover:border-slate-600 disabled:opacity-30 transition-colors"
              >
                Show all
              </button>
              <button
                onClick={() => toggleAll(false)}
                disabled={allOff}
                className="flex-1 text-[10px] py-1 rounded border border-slate-700/60 text-slate-500 hover:text-slate-300 hover:border-slate-600 disabled:opacity-30 transition-colors"
              >
                Hide all
              </button>
            </div>
          </div>
        )}

        <div className="h-px bg-slate-700/40" />

        {/* ── Records list ── */}
        <SectionHeader
          title="Records"
          count={records.length}
          expanded={recordsOpen}
          onToggle={() => setRecordsOpen((v) => !v)}
        />

        {recordsOpen && (
          <div className="px-3 pb-4">
            {loading ? (
              <div className="py-4 text-center text-xs text-slate-600">
                Loading records...
              </div>
            ) : records.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-600">
                No records visible — check layer filters
              </div>
            ) : (
              <div className="space-y-2">
                {LAYER_ORDER.filter(
                  (key) => layerFilters[key] && byLayer[key].length > 0,
                ).map((key) => (
                  <div key={key}>
                    {/* Layer group header */}
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider py-1 mb-0.5"
                      style={{ color: LAYER_COLORS[key] }}
                    >
                      {LAYER_LABELS[key]} ({byLayer[key].length})
                    </div>

                    <div className="space-y-0.5">
                      {byLayer[key].map((rec) => {
                        const color = LAYER_COLORS[rec.layer_type];
                        const isSelected = selectedId === rec.id;

                        return (
                          <button
                            key={rec.id}
                            onClick={() => onSelectRecord(rec)}
                            className={cn(
                              'w-full text-left rounded px-2 py-1.5 transition-all border',
                              isSelected
                                ? 'bg-blue-900/30 border-blue-500/40 ring-1 ring-blue-500/20'
                                : 'bg-transparent border-transparent hover:bg-slate-900/40 hover:border-slate-700/40',
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs text-slate-200 truncate leading-tight">
                                {rec.name}
                              </span>
                            </div>
                            <div className="pl-3 text-[10px] text-slate-500 truncate mt-0.5">
                              {[rec.city, rec.state_province]
                                .filter(Boolean)
                                .join(', ')}
                              {rec.layer_type === 'population' &&
                                rec.population != null && (
                                  <span className="ml-1.5 text-orange-400 font-medium">
                                    {rec.population.toLocaleString()}
                                  </span>
                                )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CRM link */}
      <div className="shrink-0 border-t border-slate-700/40 px-3 py-2.5">
        <Link
          href="/crm"
          className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors group"
        >
          <Users className="w-3.5 h-3.5 group-hover:text-blue-400" />
          <span className="uppercase tracking-wider">Family CRM</span>
        </Link>
      </div>
    </div>
  );
}
