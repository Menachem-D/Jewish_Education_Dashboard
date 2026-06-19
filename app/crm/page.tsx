'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Users, Baby, Search, ChevronDown, X, Mail, Phone, MapPin, Pencil, Trash2, Copy, MessageCircle } from 'lucide-react';
import type { Family, Child } from '@/types/crm';
import PopupButton from '@/components/ui/PopupButton';
import EmailModal from '@/components/EmailModal';
import WhatsAppModal from '@/components/WhatsAppModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400',
  inactive: 'text-slate-500',
  prospect: 'text-yellow-400',
};

const STATUS_BG: Record<string, string> = {
  active: 'bg-green-900/30 text-green-400 border-green-800/50',
  inactive: 'bg-slate-800 text-slate-500 border-slate-700',
  prospect: 'bg-yellow-900/20 text-yellow-400 border-yellow-800/40',
};

function calcAge(birthday?: string | null, birthYear?: number | null): number | null {
  const now = new Date();
  if (birthday) {
    const b = new Date(birthday);
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }
  if (birthYear != null) return now.getFullYear() - birthYear;
  return null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const AGES = Array.from({ length: 22 }, (_, i) => i);

function buildPersonSearchUrl(firstName: string, lastName: string, city?: string | null, state?: string | null) {
  const loc = [city, state].filter(Boolean).join(' ');
  return (
    `https://www.truepeoplesearch.com/results` +
    `?name=${encodeURIComponent(`${firstName} ${lastName}`)}` +
    `&citystatezip=${encodeURIComponent(loc)}`
  );
}

function buildFacebookUrl(familyName: string, city?: string | null) {
  return `https://www.facebook.com/search/top/?q=${encodeURIComponent(
    [familyName, city].filter(Boolean).join(' '),
  )}`;
}

function buildMessengerUrl(facebookProfileUrl: string): string {
  // Extract handle/id from a FB profile URL like https://www.facebook.com/john.doe or /profile.php?id=123
  const idMatch = facebookProfileUrl.match(/[?&]id=(\d+)/);
  if (idMatch) return `https://www.facebook.com/messages/t/${idMatch[1]}`;
  const handleMatch = facebookProfileUrl.match(/facebook\.com\/([^/?#]+)/);
  const handle = handleMatch?.[1];
  if (!handle || ['messages', 'groups', 'pages', 'events', 'watch', 'marketplace', 'search'].includes(handle)) return '';
  return `https://www.facebook.com/messages/t/${handle}`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg px-4 py-2.5 flex items-center gap-3">
      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{label}</div>
        <div className="text-lg font-bold tabular-nums text-slate-100 leading-none">{value}</div>
      </div>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs text-slate-300">{value}</div>
    </div>
  );
}

function DetailPanel({
  family,
  onClose,
  onDeleted,
  onRefresh,
}: {
  family: Family;
  onClose: () => void;
  onDeleted: () => void;
  onRefresh: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/crm/families/${family.id}`, { method: 'DELETE' });
    onDeleted();
  };

  const location = [family.city, family.state_province, family.country].filter(Boolean).join(', ');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-20"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="crm-panel-enter fixed top-0 right-0 h-full w-[400px] bg-slate-900 border-l border-slate-700/80 z-30 flex flex-col shadow-2xl"
      >
        {/* Top colour bar */}
        <div
          className="px-5 py-4 border-b border-slate-700/80"
          style={{ borderTopColor: '#3B82F6', borderTopWidth: 3 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-100 leading-tight mb-1.5">
                {family.family_name} Family
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BG[family.status] ?? ''}`}>
                  {family.status}
                </span>
                {family.jewish_lineage && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-purple-900/20 text-purple-400 border-purple-800/40">
                    {family.jewish_lineage}
                  </span>
                )}
                {family.affiliation && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
                    {family.affiliation}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-slate-700/50 transition-colors shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Parents */}
          {(family.father_first_name || family.mother_first_name) && (
            <div className="px-5 py-3 border-b border-slate-800/80">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Parents</p>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Father" value={family.father_first_name ? `${family.father_first_name} ${family.family_name}` : null} />
                <InfoRow label="Mother" value={family.mother_first_name ? `${family.mother_first_name} ${family.family_name}` : null} />
              </div>
            </div>
          )}

          {/* Contact */}
          {(family.email || family.phone || location) && (
            <div className="px-5 py-3 border-b border-slate-800/80 space-y-2">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Contact</p>
              {family.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-slate-600 shrink-0" />
                  <a href={`mailto:${family.email}`} className="text-xs text-blue-400 hover:text-blue-300 flex-1 min-w-0 truncate">
                    {family.email}
                  </a>
                  <button
                    onClick={() => setEmailOpen(true)}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:border-blue-500/60 hover:text-blue-400 transition-colors shrink-0"
                  >
                    <Mail className="w-2.5 h-2.5" /> Compose
                  </button>
                </div>
              )}
              {family.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                  <a href={`tel:${family.phone}`} className="text-xs text-blue-400 hover:text-blue-300 flex-1 min-w-0 truncate">
                    {family.phone}
                  </a>
                  <button
                    onClick={() => setWhatsAppOpen(true)}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:border-green-500/60 hover:text-green-400 transition-colors shrink-0"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.52 3.58 1.43 5.06L2 22l5.08-1.41C8.52 21.46 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.47 12.77c-.25-.12-1.45-.71-1.68-.8-.23-.09-.4-.13-.57.12-.17.25-.63.8-.78.97-.14.17-.29.19-.54.07-.25-.12-1.05-.38-2-.92-.74-.66-1.23-1.48-1.38-1.73-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.25.25-.42.09-.17.05-.32-.01-.44-.06-.12-.57-1.32-.78-1.81-.2-.48-.41-.42-.57-.43h-.49c-.17 0-.44.06-.67.31-.23.25-.87.84-.87 2.04s.89 2.37 1.01 2.53c.12.17 1.66 2.53 4.02 3.49 1.47.63 2.06.68 2.81.57.46-.07 1.41-.55 1.61-1.08.2-.53.2-1.03.14-1.14-.06-.11-.23-.17-.48-.29z"/></svg>
                    WhatsApp
                  </button>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                  {location}
                </div>
              )}
              {family.facebook_url && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MessageCircle className="w-3 h-3 text-slate-600 shrink-0" />
                  <span className="truncate flex-1 text-[10px] text-slate-600">{family.facebook_url}</span>
                </div>
              )}
            </div>
          )}

          {/* Program */}
          {(family.program || family.enrollment_date) && (
            <div className="px-5 py-3 border-b border-slate-800/80">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Enrollment</p>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Program" value={family.program} />
                <InfoRow label="Enrolled" value={family.enrollment_date ? formatDate(family.enrollment_date) : null} />
              </div>
            </div>
          )}

          {/* Children */}
          <div className="px-5 py-3 border-b border-slate-800/80">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">
              Children ({family.children?.length ?? 0})
            </p>
            {(family.children ?? []).length === 0 ? (
              <p className="text-[10px] text-slate-700 italic">No children recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {(family.children as Child[]).map((c) => {
                  const age = calcAge(c.birthday, c.birth_year);
                  const bdayStr = c.birthday ? formatDate(c.birthday) : null;
                  return (
                    <div key={c.id} className="flex items-center justify-between rounded border border-slate-700/40 px-3 py-2">
                      <div>
                        <span className="text-xs font-medium text-slate-200">{c.first_name}</span>
                        {c.gender && <span className="ml-2 text-[10px] text-slate-500">{c.gender}</span>}
                      </div>
                      <div className="text-right">
                        {bdayStr && <div className="text-[10px] text-slate-500">{bdayStr}</div>}
                        {age !== null && (
                          <div className="text-[10px] text-blue-400 font-medium">Age {age}</div>
                        )}
                        {!bdayStr && c.birth_year && age === null && (
                          <div className="text-[10px] text-slate-500">b. {c.birth_year}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Lookup */}
          <div className="px-5 py-3 border-b border-slate-800/80">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2.5">Quick Lookup</p>
            <div className="space-y-1.5">
              {family.father_first_name && (
                <PopupButton
                  label={`Search ${family.father_first_name} ${family.family_name}`}
                  sublabel="truepeoplesearch.com"
                  url={buildPersonSearchUrl(family.father_first_name, family.family_name, family.city, family.state_province)}
                  color="#6366F1"
                />
              )}
              {family.mother_first_name && (
                <PopupButton
                  label={`Search ${family.mother_first_name} ${family.family_name}`}
                  sublabel="truepeoplesearch.com"
                  url={buildPersonSearchUrl(family.mother_first_name, family.family_name, family.city, family.state_province)}
                  color="#8B5CF6"
                />
              )}
              {!family.father_first_name && !family.mother_first_name && (
                <PopupButton
                  label={`Search ${family.family_name} Family`}
                  sublabel="truepeoplesearch.com"
                  url={buildPersonSearchUrl(family.family_name, '', family.city, family.state_province)}
                  color="#6366F1"
                />
              )}
              <PopupButton
                label="Facebook Search"
                sublabel={`"${family.family_name}"${family.city ? ` · ${family.city}` : ''}`}
                url={buildFacebookUrl(family.family_name, family.city)}
                color="#3B82F6"
              />
              {/* Direct Messenger link if profile URL saved; otherwise name-search fallback */}
              {family.facebook_url && buildMessengerUrl(family.facebook_url) ? (
                <PopupButton
                  label={`Open Messenger — ${family.family_name}`}
                  sublabel="Direct conversation ✓"
                  url={buildMessengerUrl(family.facebook_url)!}
                  color="#7C3AED"
                />
              ) : (
                <>
                  {family.father_first_name && (
                    <PopupButton
                      label={`Messenger — ${family.father_first_name} ${family.family_name}`}
                      sublabel="Search · add Facebook URL to go direct"
                      url={`https://www.facebook.com/search/people/?q=${encodeURIComponent(`${family.father_first_name} ${family.family_name}`)}`}
                      color="#A855F7"
                    />
                  )}
                  {family.mother_first_name && (
                    <PopupButton
                      label={`Messenger — ${family.mother_first_name} ${family.family_name}`}
                      sublabel="Search · add Facebook URL to go direct"
                      url={`https://www.facebook.com/search/people/?q=${encodeURIComponent(`${family.mother_first_name} ${family.family_name}`)}`}
                      color="#A855F7"
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {family.notes && (
            <div className="px-5 py-3">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-xs text-slate-400 leading-relaxed">{family.notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-slate-700/80 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/crm/${family.id}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </Link>
            {family.email && (
              <button
                onClick={() => setEmailOpen(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-700 text-blue-400 hover:bg-blue-900/20 hover:border-blue-700 transition-colors"
              >
                <Mail className="w-3 h-3" /> Email
              </button>
            )}
            {family.phone && (
              <button
                onClick={() => setWhatsAppOpen(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-700 text-green-400 hover:bg-green-900/20 hover:border-green-700 transition-colors"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </button>
            )}
          </div>

          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-red-400">Delete this family?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white disabled:opacity-50"
              >
                {deleting ? '…' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-400"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-700 text-red-400 hover:bg-red-900/20 hover:border-red-800 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      </div>

      {emailOpen && family.email && (
        <EmailModal
          to={family.email}
          toName={[family.father_first_name, family.family_name].filter(Boolean).join(' ')}
          onClose={() => setEmailOpen(false)}
        />
      )}
      {whatsAppOpen && family.phone && (
        <WhatsAppModal
          phone={family.phone}
          toName={[family.father_first_name, family.family_name].filter(Boolean).join(' ')}
          onClose={() => setWhatsAppOpen(false)}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);

  useEffect(() => {
    fetch('/api/crm/duplicates')
      .then((r) => r.json())
      .then((d: unknown[]) => setDuplicateCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, [families]); // re-check after list reloads (e.g. after import)

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (ageFilter) params.set('child_age', ageFilter);

    try {
      const res = await fetch(`/api/crm/families?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setFamilies(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, ageFilter]);

  useEffect(() => {
    const t = setTimeout(fetchFamilies, 250);
    return () => clearTimeout(t);
  }, [fetchFamilies]);

  // Refresh selected family data when list reloads
  useEffect(() => {
    if (selectedFamily) {
      const updated = families.find((f) => f.id === selectedFamily.id);
      if (updated) setSelectedFamily(updated);
      else setSelectedFamily(null);
    }
  }, [families]);

  const totalChildren = families.reduce((s, f) => s + (f.children?.length ?? 0), 0);
  const activeCount = families.filter((f) => f.status === 'active').length;

  return (
    <div className="h-full flex flex-col">
      {/* Stats + filters bar */}
      <div className="shrink-0 px-6 pt-4 pb-3 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Families" value={families.length} icon={Users} />
          <StatCard label="Children" value={totalChildren} icon={Baby} />
          <StatCard label="Active" value={activeCount} icon={Users} />
        </div>

        {/* Filter row */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              placeholder="Search family, name, email, city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none text-xs bg-slate-800 border border-slate-700 rounded pl-3 pr-7 py-2 text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          </div>

          <div className="relative">
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="appearance-none text-xs bg-slate-800 border border-slate-700 rounded pl-3 pr-7 py-2 text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">Child age</option>
              {AGES.map((a) => (
                <option key={a} value={a}>Age {a}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          </div>

          {(search || statusFilter || ageFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setAgeFilter(''); }}
              className="text-xs px-3 py-2 rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">{error}</div>
        )}

        {duplicateCount > 0 && (
          <Link
            href="/crm/duplicates"
            className="flex items-center gap-2 text-xs px-3 py-2 rounded border border-amber-700/50 bg-amber-900/20 text-amber-400 hover:bg-amber-900/30 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span>
              Found <strong>{duplicateCount}</strong> possible duplicate{duplicateCount > 1 ? 's' : ''} — Review &amp; merge →
            </span>
          </Link>
        )}
      </div>

      {/* Scrollable table */}
      <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
        <div className="h-full overflow-auto border border-slate-800 rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
              Loading families…
            </div>
          ) : families.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
              {search || statusFilter || ageFilter
                ? 'No families match your filters.'
                : 'No families yet — add one or upload a CSV.'}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-slate-500 text-left border-b border-slate-700">
                  <th className="px-4 py-3 font-medium">Family</th>
                  <th className="px-4 py-3 font-medium">Parents</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Children</th>
                </tr>
              </thead>
              <tbody>
                {families.map((f) => {
                  const isSelected = selectedFamily?.id === f.id;
                  const targetAge = ageFilter ? parseInt(ageFilter, 10) : null;
                  const matchKids =
                    targetAge !== null
                      ? (f.children as Child[]).filter(
                          (c) => calcAge(c.birthday, c.birth_year) === targetAge,
                        )
                      : null;

                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFamily(isSelected ? null : f)}
                      className={`border-t border-slate-800/60 cursor-pointer transition-colors select-none ${
                        isSelected
                          ? 'bg-blue-900/20 hover:bg-blue-900/25'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="w-1 h-3.5 rounded-full bg-blue-500 shrink-0" />
                          )}
                          {f.family_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {[f.father_first_name, f.mother_first_name].filter(Boolean).join(' & ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {[f.city, f.state_province].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{f.program || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={STATUS_COLORS[f.status] ?? 'text-slate-400'}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {f.children?.length ?? 0}
                        {matchKids && matchKids.length > 0 && (
                          <span className="ml-1.5 font-semibold text-blue-400">
                            ({matchKids.map((c) => {
                              const age = calcAge(c.birthday, c.birth_year);
                              return `${c.first_name}${age !== null ? ` · ${age}y` : ''}`;
                            }).join(', ')})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Slide-in detail panel */}
      {selectedFamily && (
        <DetailPanel
          key={selectedFamily.id}
          family={selectedFamily}
          onClose={() => setSelectedFamily(null)}
          onDeleted={() => { setSelectedFamily(null); fetchFamilies(); }}
          onRefresh={fetchFamilies}
        />
      )}
    </div>
  );
}
