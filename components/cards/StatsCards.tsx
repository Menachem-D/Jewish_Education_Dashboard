import { LayoutGrid, Eye, School, Users } from 'lucide-react';
import { MapStats } from '@/types/map-record';
import { LAYER_COLORS } from '@/types/map-record';

interface StatsCardsProps {
  stats: MapStats;
}

const CARDS = [
  {
    key: 'total' as keyof MapStats,
    label: 'Total',
    icon: LayoutGrid,
    color: 'text-slate-300',
    bg: 'bg-slate-500/10',
    ring: 'ring-slate-500/20',
  },
  {
    key: 'visible' as keyof MapStats,
    label: 'Visible',
    icon: Eye,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/20',
  },
  {
    key: 'synagogues' as keyof MapStats,
    label: 'Synagogues',
    icon: LayoutGrid,
    color: '',
    bg: '',
    ring: '',
    layerColor: LAYER_COLORS.synagogue,
  },
  {
    key: 'daySchools' as keyof MapStats,
    label: 'Day Schools',
    icon: School,
    color: '',
    bg: '',
    ring: '',
    layerColor: LAYER_COLORS.day_school,
  },
  {
    key: 'headShluchim' as keyof MapStats,
    label: 'Shluchim',
    icon: Users,
    color: '',
    bg: '',
    ring: '',
    layerColor: LAYER_COLORS.head_shliach,
  },
  {
    key: 'populationCities' as keyof MapStats,
    label: 'Pop. Cities',
    icon: Users,
    color: '',
    bg: '',
    ring: '',
    layerColor: LAYER_COLORS.population,
  },
];

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 px-3 py-2">
      {CARDS.map((card) => {
        const lc = card.layerColor;
        const cardColor = lc ? `text-[${lc}]` : card.color;
        const bgStyle = lc
          ? { backgroundColor: `${lc}15`, boxShadow: `inset 0 0 0 1px ${lc}30` }
          : undefined;
        const ringClass = lc ? '' : `ring-1 ${card.ring}`;

        return (
          <div
            key={card.key}
            className={`rounded-md p-2 ${ringClass} bg-slate-900/50`}
            style={bgStyle}
          >
            <div
              className="text-lg font-bold text-slate-100 leading-none tabular-nums"
            >
              {stats[card.key]}
            </div>
            <div
              className="text-[10px] mt-0.5 font-medium"
              style={lc ? { color: lc } : undefined}
            >
              <span className={lc ? '' : card.color}>{card.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
