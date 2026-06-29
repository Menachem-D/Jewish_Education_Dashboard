'use client';

import { LAYER_COLORS, LayerType } from '@/types/map-record';

const ENTRIES: { type: LayerType; label: string }[] = [
  { type: 'family',       label: 'CRM Family'   },
  { type: 'synagogue',    label: 'Synagogue'     },
  { type: 'chabad',       label: 'Chabad House'  },
  { type: 'day_school',   label: 'Day School'    },
  { type: 'head_shliach', label: 'Head Shliach'  },
];

export default function MapLegend() {
  return (
    <div className="absolute bottom-8 left-3 z-10 bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2.5 shadow-xl pointer-events-none">
      <div className="text-[8px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Legend</div>
      <div className="space-y-1">
        {ENTRIES.map(({ type, label }) => (
          <div key={type} className="flex items-center gap-2">
            <svg width="14" height="20" viewBox="0 0 14 20" className="shrink-0">
              <path
                d="M7 0C3.134 0 0 3.134 0 7C0 12.25 7 20 7 20C7 20 14 12.25 14 7C14 3.134 10.866 0 7 0Z"
                fill={LAYER_COLORS[type]}
              />
              <circle cx="7" cy="7" r="3" fill="white" opacity="0.85" />
            </svg>
            <span className="text-[10px] text-slate-300">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-0.5 border-t border-slate-700/40 mt-1">
          <div className="w-3.5 h-3 rounded shrink-0" style={{ background: 'linear-gradient(to right, rgba(59,130,246,0.1), rgba(59,130,246,0.6))' }} />
          <span className="text-[10px] text-slate-300">Jewish Pop. (state)</span>
        </div>
      </div>
    </div>
  );
}
