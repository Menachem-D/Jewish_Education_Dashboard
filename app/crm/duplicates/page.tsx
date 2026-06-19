'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, GitMerge, X, ArrowLeft, AlertTriangle } from 'lucide-react';
import type { DuplicatePair, Family } from '@/types/crm';

// ── Field comparison row ──────────────────────────────────────────────────────

function CompareRow({
  label,
  v1,
  v2,
}: {
  label: string;
  v1?: string | number | null;
  v2?: string | number | null;
}) {
  const s1 = v1 != null && v1 !== '' ? String(v1) : '—';
  const s2 = v2 != null && v2 !== '' ? String(v2) : '—';
  const diff = s1 !== s2;

  return (
    <tr className={diff ? 'bg-amber-950/20' : ''}>
      <td className="px-3 py-1.5 text-[10px] text-slate-600 uppercase tracking-wider font-medium whitespace-nowrap w-28">
        {label}
      </td>
      <td
        className={`px-3 py-1.5 text-xs ${diff ? 'text-amber-300' : 'text-slate-400'} border-l border-slate-700/40`}
      >
        {s1}
      </td>
      <td
        className={`px-3 py-1.5 text-xs ${diff ? 'text-amber-300' : 'text-slate-400'} border-l border-slate-700/40`}
      >
        {s2}
      </td>
    </tr>
  );
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-red-900/40 text-red-400 border-red-700/50'
      : score >= 65
      ? 'bg-amber-900/40 text-amber-400 border-amber-700/50'
      : 'bg-yellow-900/30 text-yellow-500 border-yellow-700/40';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${color}`}>
      {score}% match
    </span>
  );
}

// ── Single duplicate pair card ────────────────────────────────────────────────

function PairCard({
  pair,
  onMerge,
  onDismiss,
}: {
  pair: DuplicatePair;
  onMerge: (keepId: string, removeId: string) => void;
  onDismiss: (id1: string, id2: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const { family1: f1, family2: f2 } = pair;

  const location = (f: Family) =>
    [f.city, f.state_province].filter(Boolean).join(', ') || null;

  async function doMerge(keepId: string, removeId: string) {
    setBusy(keepId);
    await fetch(`/api/crm/families/${keepId}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merge_id: removeId }),
    });
    onMerge(keepId, removeId);
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
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/60 border-b border-slate-700/60">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <ScoreBadge score={pair.score} />
          {pair.reasons.map((r) => (
            <span
              key={r}
              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/40"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/40 text-left">
              <th className="px-3 py-2 text-[10px] text-slate-600 uppercase tracking-wider w-28" />
              <th className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider border-l border-slate-700/40">
                Record A
              </th>
              <th className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider border-l border-slate-700/40">
                Record B
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            <CompareRow label="Last name" v1={f1.family_name} v2={f2.family_name} />
            <CompareRow
              label="Father"
              v1={f1.father_first_name ? `${f1.father_first_name} ${f1.family_name}` : null}
              v2={f2.father_first_name ? `${f2.father_first_name} ${f2.family_name}` : null}
            />
            <CompareRow
              label="Mother"
              v1={f1.mother_first_name ? `${f1.mother_first_name} ${f1.family_name}` : null}
              v2={f2.mother_first_name ? `${f2.mother_first_name} ${f2.family_name}` : null}
            />
            <CompareRow label="Email" v1={f1.email} v2={f2.email} />
            <CompareRow label="Phone" v1={f1.phone} v2={f2.phone} />
            <CompareRow label="Location" v1={location(f1)} v2={location(f2)} />
            <CompareRow label="Status" v1={f1.status} v2={f2.status} />
            <CompareRow label="Lineage" v1={f1.jewish_lineage} v2={f2.jewish_lineage} />
            <CompareRow label="Affiliation" v1={f1.affiliation} v2={f2.affiliation} />
            <CompareRow label="Program" v1={f1.program} v2={f2.program} />
            <CompareRow
              label="Children"
              v1={f1.children.length || null}
              v2={f2.children.length || null}
            />
          </tbody>
        </table>
      </div>

      {/* Merge info */}
      <div className="px-4 py-2 bg-slate-900/30 border-t border-slate-700/40">
        <p className="text-[10px] text-slate-600">
          Merging combines both records — empty fields are filled from the other, children are
          moved to the kept record, and the duplicate is removed.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/40 border-t border-slate-700/60 flex-wrap">
        <button
          onClick={() => doMerge(f1.id, f2.id)}
          disabled={busy !== null}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40 transition-colors font-medium"
        >
          <GitMerge className="w-3.5 h-3.5" />
          {busy === f1.id ? 'Merging…' : 'Keep A, merge B in'}
        </button>
        <button
          onClick={() => doMerge(f2.id, f1.id)}
          disabled={busy !== null}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40 transition-colors font-medium"
        >
          <GitMerge className="w-3.5 h-3.5 scale-x-[-1]" />
          {busy === f2.id ? 'Merging…' : 'Keep B, merge A in'}
        </button>
        <button
          onClick={doDismiss}
          disabled={busy !== null}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-40 transition-colors ml-auto"
        >
          <X className="w-3.5 h-3.5" />
          {busy === 'dismiss' ? 'Dismissing…' : 'Not duplicates'}
        </button>
      </div>
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

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  function removePair(id1: string, id2: string) {
    setPairs((prev) =>
      prev.filter((p) => !(p.family1.id === id1 || p.family1.id === id2 ||
                           p.family2.id === id1 || p.family2.id === id2)),
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-700/40">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/crm"
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
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
          Review potential duplicate families and merge or dismiss each pair.
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
            <Link
              href="/crm"
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to CRM
            </Link>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {pairs.map((pair) => (
              <PairCard
                key={`${pair.family1.id}:${pair.family2.id}`}
                pair={pair}
                onMerge={(keepId, removeId) => removePair(keepId, removeId)}
                onDismiss={(id1, id2) => removePair(id1, id2)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
