'use client';

interface StatsBarProps {
  totalJewishPop: number;
  totalChildPop: number;
  totalSynagogues: number;
  totalChabad: number;
  totalSchools: number;
  usCityCount: number;
  caCityCount: number;
  familyCount: number;
  loading: boolean;
}

function StatCell({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-1.5 min-w-0">
      <span className="text-sm font-bold tabular-nums leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
}

export default function StatsBar({
  totalJewishPop, totalChildPop, totalSynagogues, totalChabad,
  totalSchools, usCityCount, caCityCount, familyCount, loading,
}: StatsBarProps) {
  if (loading) {
    return (
      <div className="h-9 bg-slate-900/80 border-b border-slate-700/40 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="shrink-0 bg-slate-900/80 border-b border-slate-700/40 backdrop-blur-sm flex items-stretch divide-x divide-slate-700/40 overflow-x-auto">
      <StatCell label="Jewish Pop."    value={fmt(totalJewishPop)} color="#F97316" />
      <StatCell label="Jewish Kids"    value={fmt(totalChildPop)}  color="#A78BFA" />
      <StatCell label="Day Schools"    value={totalSchools}        color="#22C55E" />
      <StatCell label="Synagogues"     value={totalSynagogues}     color="#3B82F6" />
      <StatCell label="Chabad Houses"  value={totalChabad}         color="#F59E0B" />
      <StatCell label="Cities Tracked" value={usCityCount + caCityCount} color="#94A3B8" />
      <StatCell label="CRM Families"   value={familyCount}         color="#EC4899" />
    </div>
  );
}
