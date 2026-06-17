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

function markerSize(record: MapRecord, isSelected: boolean): number {
  if (record.layer_type === 'population') {
    const pop = record.population ?? 0;
    if (pop === 0) return isSelected ? 16 : 10;
    // Scale logarithmically: 1k→8px, 1M→24px
    const size = Math.max(8, Math.min(28, (Math.log10(pop) - 2) * 8 + 8));
    return isSelected ? size + 4 : size;
  }
  return isSelected ? 18 : 12;
}

export default function DispatchMap({
  records,
  onSelectRecord,
  selectedId,
  flyToTarget,
}: DispatchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const loadedRef = useRef(false);

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

    map.on('load', () => {
      loadedRef.current = true;
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // Rebuild markers when records or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      records.forEach((rec) => {
        const isSelected = rec.id === selectedId;
        const color = LAYER_COLORS[rec.layer_type] ?? '#94A3B8';
        const size = markerSize(rec, isSelected);
        const isPopulation = rec.layer_type === 'population';

        const el = document.createElement('div');
        el.setAttribute('aria-label', rec.name);
        el.setAttribute('role', 'button');
        Object.assign(el.style, {
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: isPopulation ? `${color}55` : color,
          border: isSelected
            ? `2.5px solid #fff`
            : isPopulation
              ? `1.5px solid ${color}`
              : '1.5px solid rgba(255,255,255,0.5)',
          cursor: 'pointer',
          boxShadow: isSelected
            ? `0 0 0 3px ${color}50, 0 2px 8px rgba(0,0,0,0.7)`
            : '0 1px 4px rgba(0,0,0,0.5)',
          transition: 'transform 0.15s ease',
          willChange: 'transform',
        });

        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.35)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectRecord(rec);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rec.longitude, rec.latitude])
          .addTo(map);

        markersRef.current.push(marker);
      });
    };

    if (loadedRef.current) {
      addMarkers();
    } else {
      map.once('load', addMarkers);
    }
  }, [records, selectedId, onSelectRecord]);

  // Fly to target
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
