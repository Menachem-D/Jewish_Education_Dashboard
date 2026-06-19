'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MapRecord, LAYER_COLORS } from '@/types/map-record';

const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface DispatchMapProps {
  records: MapRecord[];
  onSelectRecord: (record: MapRecord) => void;
  selectedId?: string | null;
  flyToTarget?: { lat: number; lng: number } | null;
}

type MarkerEntry = { marker: maplibregl.Marker; el: HTMLElement; record: MapRecord };

function createPinElement(rec: MapRecord): HTMLElement {
  const color = LAYER_COLORS[rec.layer_type] ?? '#94A3B8';
  const el = document.createElement('div');
  el.style.cursor = 'pointer';
  el.style.transition = 'filter 0.12s ease, opacity 0.12s ease';
  el.setAttribute('aria-label', rec.name);
  el.setAttribute('role', 'button');
  el.dataset.pinType = 'location';
  el.dataset.color = color;

  el.style.filter = 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))';
  el.innerHTML = `<svg width="22" height="32" viewBox="0 0 22 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 0C4.925 0 0 4.925 0 11C0 19 11 32 11 32C11 32 22 19 22 11C22 4.925 17.075 0 11 0Z" fill="${color}"/>
    <circle cx="11" cy="11" r="5" fill="white" opacity="0.9"/>
  </svg>`;

  return el;
}

function applySelectionStyle(el: HTMLElement, isSelected: boolean) {
  const color = el.dataset.color ?? '#94A3B8';
  el.style.filter = isSelected
    ? `drop-shadow(0 0 6px ${color}cc) drop-shadow(0 2px 6px rgba(0,0,0,0.9))`
    : 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))';
  el.style.zIndex = isSelected ? '10' : '';
}

function makePopGeoJson(recs: MapRecord[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: recs.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
      properties: { weight: r.population ?? 1, name: r.name },
    })),
  };
}

const HEATMAP_PAINT: maplibregl.HeatmapLayerSpecification['paint'] = {
  // Normalize weight: 0 → 0, 2 000 000 → 1
  'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 2000000, 1],
  // Intensity scales with zoom for sharper detail when zoomed in
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 9, 2.5],
  // Radius expands at higher zoom so clusters don't collapse
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 28, 4, 44, 8, 64, 12, 80],
  'heatmap-opacity': 0.88,
  // Orange → amber → yellow → white colour ramp
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,    'rgba(249,115,22,0)',
    0.15, 'rgba(249,115,22,0.25)',
    0.35, 'rgba(251,146,60,0.50)',
    0.55, 'rgba(253,186,116,0.68)',
    0.75, 'rgba(253,224,71,0.82)',
    0.9,  'rgba(254,240,138,0.92)',
    1,    'rgba(255,255,255,0.97)',
  ],
};

export default function DispatchMap({
  records,
  onSelectRecord,
  selectedId,
  flyToTarget,
}: DispatchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerMapRef = useRef<Map<string, MarkerEntry>>(new Map());
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelectRecord);
  const selectedIdRef = useRef(selectedId);

  useEffect(() => { onSelectRef.current = onSelectRecord; }, [onSelectRecord]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-95, 38],
      zoom: 3.5,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right',
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left',
    );

    map.on('load', () => { loadedRef.current = true; });
    mapRef.current = map;

    return () => {
      markerMapRef.current.forEach(({ marker }) => marker.remove());
      markerMapRef.current.clear();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // ── Population heatmap ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const popRecs = records.filter((r) => r.layer_type === 'population');
    const geojson = makePopGeoJson(popRecs);

    const apply = () => {
      if (map.getSource('pop-heat')) {
        (map.getSource('pop-heat') as maplibregl.GeoJSONSource).setData(geojson);
        map.setLayoutProperty(
          'pop-heat-layer',
          'visibility',
          popRecs.length > 0 ? 'visible' : 'none',
        );
      } else if (popRecs.length > 0) {
        map.addSource('pop-heat', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'pop-heat-layer',
          type: 'heatmap',
          source: 'pop-heat',
          paint: HEATMAP_PAINT,
        });
      }
    };

    if (loadedRef.current) apply();
    else map.once('load', apply);
  }, [records]);

  // ── Marker sync (non-population) ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Population records are handled by the heatmap layer above
    const pinRecs = records.filter((r) => r.layer_type !== 'population');

    const sync = () => {
      const existing = markerMapRef.current;
      const nextIds = new Set(pinRecs.map((r) => r.id));

      // Remove markers no longer in the visible set
      existing.forEach(({ marker }, id) => {
        if (!nextIds.has(id)) {
          marker.remove();
          existing.delete(id);
        }
      });

      // Add new markers
      pinRecs.forEach((rec) => {
        if (existing.has(rec.id)) return;

        const el = createPinElement(rec);
        applySelectionStyle(el, rec.id === selectedIdRef.current);

        el.addEventListener('mouseenter', () => {
          if (rec.id !== selectedIdRef.current) {
            const color = el.dataset.color ?? '#94A3B8';
            el.style.filter = `drop-shadow(0 0 5px ${color}99) drop-shadow(0 1px 4px rgba(0,0,0,0.7))`;
          }
        });
        el.addEventListener('mouseleave', () => {
          if (rec.id !== selectedIdRef.current) {
            el.style.filter = 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))';
          }
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectRef.current(rec);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([rec.longitude, rec.latitude])
          .addTo(map);

        existing.set(rec.id, { marker, el, record: rec });
      });
    };

    if (loadedRef.current) sync();
    else map.once('load', sync);
  }, [records]);

  // ── Selection style ───────────────────────────────────────────────────────
  useEffect(() => {
    markerMapRef.current.forEach(({ el, record }) => {
      applySelectionStyle(el, record.id === selectedId);
    });
  }, [selectedId]);

  // ── Fly to target ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: 13,
      duration: 1000,
      essential: true,
    });
  }, [flyToTarget]);

  return <div ref={containerRef} className="w-full h-full" />;
}
