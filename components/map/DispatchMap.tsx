'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MapRecord, LAYER_COLORS } from '@/types/map-record';
import MapLegend from './MapLegend';

const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const US_STATES_GEOJSON =
  'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';

interface LayerVisibility {
  families?: boolean;
  synagogue?: boolean;
  chabad?: boolean;
  day_school?: boolean;
  head_shliach?: boolean;
  choropleth?: boolean;
}

interface DispatchMapProps {
  records: MapRecord[];           // family DOM markers
  instRecords?: MapRecord[];      // institutional GeoJSON layers
  layerVisibility?: LayerVisibility;
  choroplethData?: Record<string, number>; // full state name → jewish pop
  onSelectRecord: (record: MapRecord) => void;
  selectedId?: string | null;
  flyToTarget?: { lat: number; lng: number; zoom?: number } | null;
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

function makeInstGeoJson(recs: MapRecord[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: recs.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
      properties: {
        id: r.id,
        name: r.name,
        layer_type: r.layer_type,
        city: r.city ?? '',
        color: LAYER_COLORS[r.layer_type] ?? '#94A3B8',
      },
    })),
  };
}

const INST_LAYER_TYPES = ['synagogue', 'chabad', 'day_school', 'head_shliach'] as const;

export default function DispatchMap({
  records,
  instRecords = [],
  layerVisibility = {},
  choroplethData = {},
  onSelectRecord,
  selectedId,
  flyToTarget,
}: DispatchMapProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const markerMapRef  = useRef<Map<string, MarkerEntry>>(new Map());
  const loadedRef     = useRef(false);
  const onSelectRef   = useRef(onSelectRecord);
  const selectedIdRef = useRef(selectedId);
  const choroplethRef = useRef(choroplethData);
  const visRef        = useRef(layerVisibility);

  useEffect(() => { onSelectRef.current   = onSelectRecord; }, [onSelectRecord]);
  useEffect(() => { selectedIdRef.current = selectedId; },    [selectedId]);
  useEffect(() => { choroplethRef.current = choroplethData; }, [choroplethData]);
  useEffect(() => { visRef.current        = layerVisibility; }, [layerVisibility]);

  function buildChoroplethExpression(data: Record<string, number>) {
    const pairs = Object.entries(data).flatMap(([k, v]) => [k, v] as [string, number]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchExpr: any[] = ['match', ['get', 'name'], ...pairs, 0];
    return [
      'interpolate', ['linear'], matchExpr,
      0,       'rgba(59,130,246,0.00)',
      10000,   'rgba(59,130,246,0.08)',
      50000,   'rgba(59,130,246,0.15)',
      200000,  'rgba(59,130,246,0.28)',
      500000,  'rgba(59,130,246,0.42)',
      1000000, 'rgba(59,130,246,0.58)',
      2000000, 'rgba(59,130,246,0.75)',
    ];
  }

  // ── Initialize map once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-95, 38],
      zoom: 3.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      loadedRef.current = true;

      // ── Choropleth: US state boundaries ────────────────────────────────────
      fetch(US_STATES_GEOJSON)
        .then((r) => r.json())
        .then((geojson) => {
          if (!mapRef.current) return;
          map.addSource('us-states', { type: 'geojson', data: geojson });

          map.addLayer({
            id: 'state-fill',
            type: 'fill',
            source: 'us-states',
            layout: { visibility: visRef.current.choropleth ? 'visible' : 'none' },
            paint: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              'fill-color': buildChoroplethExpression(choroplethRef.current) as any,
              'fill-opacity': 1,
            },
          });

          map.addLayer({
            id: 'state-outline',
            type: 'line',
            source: 'us-states',
            layout: { visibility: visRef.current.choropleth ? 'visible' : 'none' },
            paint: { 'line-color': 'rgba(59,130,246,0.25)', 'line-width': 0.5 },
          });
        })
        .catch(() => {});

      // ── Institutional clustered source ──────────────────────────────────────
      map.addSource('inst-points', {
        type: 'geojson',
        data: makeInstGeoJson([]),
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 40,
      });

      // Cluster circles
      map.addLayer({
        id: 'inst-clusters',
        type: 'circle',
        source: 'inst-points',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(148,163,184,0.7)',
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 22],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(148,163,184,0.4)',
        },
      });

      map.addLayer({
        id: 'inst-cluster-count',
        type: 'symbol',
        source: 'inst-points',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Individual circles for each institution type
      for (const lt of INST_LAYER_TYPES) {
        const color = LAYER_COLORS[lt];
        map.addLayer({
          id: `inst-${lt}`,
          type: 'circle',
          source: 'inst-points',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'layer_type'], lt]],
          layout: {
            visibility: (visRef.current as Record<string, boolean>)[lt] ? 'visible' : 'none',
          },
          paint: {
            'circle-color': color,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 5, 12, 7],
            'circle-stroke-width': 1,
            'circle-stroke-color': 'rgba(0,0,0,0.5)',
            'circle-opacity': 0.85,
          },
        });
      }

      // Click handler for institutional points
      for (const lt of INST_LAYER_TYPES) {
        map.on('click', `inst-${lt}`, (e) => {
          if (!e.features?.[0]) return;
          const props = e.features[0].properties as Record<string, string>;
          new maplibregl.Popup({ closeButton: false, offset: 8 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:11px;max-width:200px;line-height:1.4">
                <strong>${props.name}</strong>
                <div style="color:#94a3b8;margin-top:2px">${props.city}</div>
              </div>`
            )
            .addTo(map);
        });
      }

      // Zoom into cluster on click
      map.on('click', 'inst-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['inst-clusters'] });
        if (!features[0]) return;
        const clusterId = features[0].properties.cluster_id as number;
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const src = map.getSource('inst-points') as maplibregl.GeoJSONSource;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = src.getClusterExpansionZoom(clusterId) as any;
        if (result && typeof result.then === 'function') {
          result.then((zoom: number) => { map.easeTo({ center: coords, zoom }); }).catch(() => {});
        } else if (typeof result === 'number') {
          map.easeTo({ center: coords, zoom: result });
        }
      });

      map.on('mouseenter', 'inst-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'inst-clusters', () => { map.getCanvas().style.cursor = ''; });
      for (const lt of INST_LAYER_TYPES) {
        map.on('mouseenter', `inst-${lt}`, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', `inst-${lt}`, () => { map.getCanvas().style.cursor = ''; });
      }
    });

    mapRef.current = map;

    return () => {
      markerMapRef.current.forEach(({ marker }) => marker.remove());
      markerMapRef.current.clear();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // ── Update institutional GeoJSON data ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const src = map.getSource('inst-points') as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(makeInstGeoJson(instRecords));
    };

    if (loadedRef.current) apply();
    else map.once('load', apply);
  }, [instRecords]);

  // ── Layer visibility toggles ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const vis = (type: string) =>
      (layerVisibility as Record<string, boolean | undefined>)[type] ? 'visible' : 'none';

    for (const lt of INST_LAYER_TYPES) {
      if (map.getLayer(`inst-${lt}`)) {
        map.setLayoutProperty(`inst-${lt}`, 'visibility', vis(lt));
      }
    }

    if (map.getLayer('state-fill')) {
      const choro = layerVisibility.choropleth ? 'visible' : 'none';
      map.setLayoutProperty('state-fill',    'visibility', choro);
      map.setLayoutProperty('state-outline', 'visibility', choro);
    }
  }, [layerVisibility]);

  // ── Update choropleth colors when data changes ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !map.getLayer('state-fill')) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.setPaintProperty('state-fill', 'fill-color', buildChoroplethExpression(choroplethData) as any);
  }, [choroplethData]);

  // ── Family DOM markers ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pinRecs = records.filter((r) => r.layer_type !== 'population');

    const sync = () => {
      const existing = markerMapRef.current;
      const nextIds  = new Set(pinRecs.map((r) => r.id));

      existing.forEach(({ marker }, id) => {
        if (!nextIds.has(id)) { marker.remove(); existing.delete(id); }
      });

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
          if (rec.id !== selectedIdRef.current)
            el.style.filter = 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))';
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

  // ── Selection style ─────────────────────────────────────────────────────────
  useEffect(() => {
    markerMapRef.current.forEach(({ el, record }) => {
      applySelectionStyle(el, record.id === selectedId);
    });
  }, [selectedId]);

  // ── Fly to target ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: flyToTarget.zoom ?? 13,
      duration: 1000,
      essential: true,
    });
  }, [flyToTarget]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <MapLegend />
    </div>
  );
}
