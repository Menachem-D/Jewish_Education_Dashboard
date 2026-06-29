'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, GitMerge, X, ArrowLeft, AlertTriangle, AlertCircle } from 'lucide-react';
import type { DuplicatePair, Family } from '@/types/crm';

// Pick the "better" record to keep: more filled fields wins; ties go to older record
function pickKeeper(f1: Family, f2: Family): [keepId: string, removeId: string] {
  const richness = (f: Family) =>
    [f.father_first_name, f.mother_first_name, f.email, f.phone,
     f.city, f.notes, f.affiliation, f.program, f.jewish_lineage]
      .filter(Boolean).length + f.children.length * 2;
  return richness(f1) >= richness(f2) ? [f1.id, f2.id] : [f2.id, f1.id];
}

// ── Field comparison row ──────────────────────────────────────────────────────

function CompareRow({ label, v1, v2 }: { label: string; v1?: string | number | null; v2?: string | number | null }) {
  const s1 = v1 != null && v1 !== '' ? String(v1) : '—';
  const s2 = v2 != null && v2 !== '' ? String(v2) : '—';
  const diff = s1 !== s2 && s1 !== '—' && s2 !== '—';
  const oneEmpty = s1 !== s2 && (s1 === '—' || s2 === '—');

  return (
    <tr className={diff ? 'bg-amber-950/20' : oneEmpty ? 'bg-blue-950/10' : ''}>
      <td className="px-3 py-1.5 text-[10px] text-slate-600 uppercase tracking-wider font-medium whitespace-nowrap w-28">
        {label}
      </td>
      <td className={`px-3 py-1.5 text-xs border-l border-slate-700/40 ${diff ? 'text-amber-300' : oneEmpty && s1 !== '—' ? 'text-blue-300' : 'text-slate-400'}`}>
        {s1}
      </td>
      <td className={`px-3 py-1.5 text-xs border-l border-slate-700/40 ${diff ? 'text-amber-300' : oneEmpty && s2 !== '—' ? 'text-blue-300' : 'text-slate-400'}`}>
        {s2}
      </td>
    </tr>
  );
}

// ── Single duplicate pair card ────────────────────────────────────────────────

function PairCard({ pair, onMerge, onDismiss }: {
  pair: DuplicatePair;
  onMerge: (id1: string, id2: string) => void;
  onDismiss: (id1: string, id2: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const { family1: f1, family2: f2 } = pair;

  const location = (f: Family) => [f.city, f.state_province].filter(Boolean).join(', ') || null;

  async function doMerge() {
    setBusy('merge');
    const [keepId, removeId] = pickKeeper(f1, f2);
    await fetch(`/api/crm/families/${keepId}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merge_id: removeId }),
    });
    onMerge(f1.id, f2.id);
  }

  async function doDismiss() {
    setBusy('dismiss');
    await fetch('/api/crm/duplicates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id1: f1.id, id2: f2.id }),
    });
    onDismiss(f1.id, f2.id);
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg">
      {/* Reasons */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-b border-slate-700/60 flex-wrap">
        {pair.reasons.map((r) => (
          <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/40">
            {r}
          </span>
        ))}
      </div>

      {/* Side-by-side comparison */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/40 text-left">
              <th className="px-3 py-2 text-[10px] text-slate-600 uppercase tracking-wider w-28" />
              <th className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider border-l border-slate-700/40">Record A</th>
              <th className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider border-l border-slate-700/40">Record B</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            <CompareRow label="Last name"   v1={f1.family_name}       v2={f2.family_name} />
            <CompareRow label="Father"      v1={f1.father_first_name ? `${f1.father_first_name} ${f1.family_name}` : null} v2={f2.father_first_name ? `${f2.father_first_name} ${f2.family_name}` : null} />
            <CompareRow label="Mother"      v1={f1.mother_first_name ? `${f1.mother_first_name} ${f1.family_name}` : null} v2={f2.mother_first_name ? `${f2.mother_first_name} ${f2.family_name}` : null} />
            <CompareRow label="Email"       v1={f1.email}             v2={f2.email} />
            <CompareRow label="Phone"       v1={f1.phone}             v2={f2.phone} />
            <CompareRow label="Location"    v1={location(f1)}         v2={location(f2)} />
            <CompareRow label="Status"      v1={f1.status}            v2={f2.status} />
            <CompareRow label="Lineage"     v1={f1.jewish_lineage}    v2={f2.jewish_lineage} />
            <CompareRow label="Affiliation" v1={f1.affiliation}       v2={f2.affiliation} />
            <CompareRow label="Program"     v1={f1.program}           v2={f2.program} />
            <CompareRow label="Children"    v1={f1.children.length || null} v2={f2.children.length || null} />
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/40 border-t border-slate-700/60">
        <button
          onClick={doMerge}
          disabled={busy !== null}
          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40 transition-colors font-medium"
        >
          <GitMerge className="w-3.5 h-3.5" />
          {busy === 'merge' ? 'Merging…' : 'Merge'}
        </button>
        <button
          onClick={doDismiss}
          disabled={busy !== null}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-40 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {busy === 'dismiss' ? 'Ignoring…' : 'Ignore'}
        </button>
        <p className="ml-auto text-[10px] text-slate-700">
          Merge combines both records — all unique data is kept, duplicates removed.
        </p>
      </div>
    </div>
  );
}

// ── Group section ─────────────────────────────────────────────────────────────

function GroupSection({ title, icon: Icon, iconClass, pairs, onMerge, onDismiss }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  pairs: DuplicatePair[];
  onMerge: (id1: string, id2: string) => void;
  onDismiss: (id1: string, id2: string) => void;
}) {
  if (pairs.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconClass}`} />
        <h2 className={`text-xs font-bold uppercase tracking-widest ${iconClass}`}>{title}</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400">{pairs.length}</span>
      </div>
      {pairs.map((pair) => (
        <PairCard
          key={`${pair.family1.id}:${pair.family2.id}`}
          pair={pair}
          onMerge={onMerge}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DuplicatesPage() {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPairs = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/duplicates')
      .then((r) => r.json())
      .then((data: DuplicatePair[]) => setPairs(data))
      .catch(() => setPairs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPairs(); }, [fetchPairs]);

  function removePair(id1: string, id2: string) {
    setPairs((prev) =>
      prev.filter((p) =>
        !(p.family1.id === id1 || p.family1.id === id2 ||
          p.family2.id === id1 || p.family2.id === id2),
      ),
    );
  }

  // Categorize: "same last name" pairs (clear duplicates) vs everything else (possible matches)
  const sameName = pairs.filter((p) => p.reasons.includes('Same last name'));
  const possible = pairs.filter((p) => !p.reasons.includes('Same last name'));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-700/40">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/crm" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-bold text-slate-100 tracking-wide">Duplicate Review</h1>
          {!loading && pairs.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-700/40 font-semibold">
              {pairs.length} found
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-600 pl-7">
          Review potential duplicate families. Merge combines all data into one record.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
            Scanning for duplicates…
          </div>
        ) : pairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <CheckCircle2 className="w-10 h-10 text-green-500/60" />
            <p className="text-slate-500 text-sm font-medium">No duplicates found</p>
            <p className="text-slate-700 text-xs">Your CRM contacts look clean.</p>
            <Link href="/crm" className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to CRM
            </Link>
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl">
            <GroupSection
              title="Same family name"
              icon={AlertTriangle}
              iconClass="text-amber-400"
              pairs={sameName}
              onMerge={removePair}
              onDismiss={removePair}
            />
            <GroupSection
              title="Possible match"
              icon={AlertCircle}
              iconClass="text-slate-500"
              pairs={possible}
              onMerge={removePair}
              onDismiss={removePair}
            />
          </div>
        )}
      </div>
    </div>
  );
}
