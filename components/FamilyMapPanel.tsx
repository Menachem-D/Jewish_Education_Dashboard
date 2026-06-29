'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, MapPin, Phone, Mail, Users, ExternalLink, Pencil, Trash2, Plus } from 'lucide-react';
import type { Family, Child, ChildGender, JewishLineage } from '@/types/crm';
import { JEWISH_LINEAGE_OPTIONS } from '@/types/crm';
import PopupButton from '@/components/ui/PopupButton';
import SocialIconButton from '@/components/ui/SocialIconButton';

// ── URL helpers ───────────────────────────────────────────────────────────────

function personSearchUrl(first: string, last: string, city?: string | null, state?: string | null) {
  const loc = [city, state].filter(Boolean).join(' ');
  return (
    `https://www.truepeoplesearch.com/results` +
    `?name=${encodeURIComponent(`${first} ${last}`)}` +
    `&citystatezip=${encodeURIComponent(loc)}`
  );
}

function facebookUrl(familyName: string, city?: string | null) {
  return `https://www.facebook.com/search/top/?q=${encodeURIComponent(
    [familyName, city].filter(Boolean).join(' '),
  )}`;
}

function instagramUrl(name: string) {
  return `https://www.instagram.com/search?q=${encodeURIComponent(name)}`;
}

function whatsappUrl(phone: string | null): string | null {
  if (!phone) return null;
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

function googleContactsUrl(name: string) {
  return `https://contacts.google.com/search/${encodeURIComponent(name)}`;
}

function gmailUrl(email: string | null, name: string) {
  const query = email ? `from:${email} OR to:${email}` : name;
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}

function labelColor(label: string): string {
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4'];
  let hash = 0;
  for (const c of label) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length];
}

// ── Grade / age helpers ───────────────────────────────────────────────────────

function schoolYear(): number {
  const now = new Date();
  // School year starts in August
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

function gradeFromBirthYear(by: number): number {
  return schoolYear() - by - 5;
}

function birthYearFromGrade(grade: number): number {
  return schoolYear() - grade - 5;
}

function ageFromBirthYear(by: number): number {
  // approximate — we only know the year, not the day
  return new Date().getFullYear() - by;
}

function gradeLabel(g: number | null): string {
  if (g == null) return '';
  if (g < 0) return 'Pre-K';
  if (g === 0) return 'K';
  return `Gr. ${g}`;
}

function gradeToStr(g: number | null): string {
  if (g == null) return '';
  if (g === 0) return 'K';
  if (g < 0) return 'PK';
  return String(g);
}

function parseGrade(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (t === 'k') return 0;
  if (t === 'pk' || t === 'pre-k' || t === 'prek') return -1;
  const n = parseInt(t);
  return isNaN(n) ? null : n;
}

function childBirthYear(c: Child): number | null {
  if (c.birth_year != null) return c.birth_year;
  if (c.birthday) return new Date(c.birthday).getFullYear();
  return null;
}

// ── Child editor ──────────────────────────────────────────────────────────────

interface ChildDraft {
  first_name: string;
  age: string;
  birth_year: string;
  grade: string;
  bar_mitzvah_parsha: string;
  gender: string;
}

const EMPTY_DRAFT: ChildDraft = {
  first_name: '',
  age: '',
  birth_year: '',
  grade: '',
  bar_mitzvah_parsha: '',
  gender: '',
};

function draftFromChild(c: Child): ChildDraft {
  const by = childBirthYear(c);
  const grade = by != null ? gradeFromBirthYear(by) : null;
  return {
    first_name: c.first_name,
    age: by != null ? String(ageFromBirthYear(by)) : '',
    birth_year: by != null ? String(by) : '',
    grade: gradeToStr(grade),
    bar_mitzvah_parsha: c.bar_mitzvah_parsha ?? '',
    gender: c.gender ?? '',
  };
}

interface ChildFormProps {
  draft: ChildDraft;
  onChange: (d: ChildDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function ChildForm({ draft, onChange, onSave, onCancel, saving }: ChildFormProps) {
  function set(patch: Partial<ChildDraft>) {
    onChange({ ...draft, ...patch });
  }

  function onAge(v: string) {
    const age = parseInt(v);
    if (!isNaN(age) && age > 0 && age < 30) {
      const by = new Date().getFullYear() - age;
      set({ age: v, birth_year: String(by), grade: gradeToStr(gradeFromBirthYear(by)) });
    } else {
      set({ age: v });
    }
  }

  function onBirthYear(v: string) {
    const by = parseInt(v);
    if (!isNaN(by) && by > 1990 && by <= new Date().getFullYear()) {
      set({ birth_year: v, age: String(ageFromBirthYear(by)), grade: gradeToStr(gradeFromBirthYear(by)) });
    } else {
      set({ birth_year: v });
    }
  }

  function onGrade(v: string) {
    const g = parseGrade(v);
    if (g != null) {
      const by = birthYearFromGrade(g);
      set({ grade: v, birth_year: String(by), age: String(ageFromBirthYear(by)) });
    } else {
      set({ grade: v });
    }
  }

  const parshaLabel =
    draft.gender === 'female' ? 'Bat Mitzvah Parsha' : 'Bar Mitzvah Parsha';

  const inputCls =
    'w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-700/60';

  return (
    <div className="mt-1 mb-1.5 bg-slate-900/60 rounded-lg p-2.5 space-y-2 border border-slate-700/50">
      <div>
        <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Child Name</div>
        <input
          placeholder="First name"
          value={draft.first_name}
          onChange={(e) => set({ first_name: e.target.value })}
          className={inputCls}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Age</div>
          <input
            type="number"
            min="0"
            max="30"
            placeholder="10"
            value={draft.age}
            onChange={(e) => onAge(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Year</div>
          <input
            type="number"
            min="1990"
            max={new Date().getFullYear()}
            placeholder="2014"
            value={draft.birth_year}
            onChange={(e) => onBirthYear(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Grade</div>
          <input
            type="text"
            placeholder="K"
            value={draft.grade}
            onChange={(e) => onGrade(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[9px] text-slate-600 uppercase tracking-wider">Gender</span>
        {(['male', 'female'] as ChildGender[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => set({ gender: draft.gender === g ? '' : g })}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              draft.gender === g
                ? 'bg-pink-900/40 border-pink-700/60 text-pink-300'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
            }`}
          >
            {g === 'male' ? 'M' : 'F'}
          </button>
        ))}
      </div>

      <input
        placeholder={parshaLabel}
        value={draft.bar_mitzvah_parsha}
        onChange={(e) => set({ bar_mitzvah_parsha: e.target.value })}
        className={inputCls}
      />

      <div className="flex gap-2 pt-0.5">
        <button
          onClick={onSave}
          disabled={saving || !draft.first_name.trim()}
          className="flex-1 text-xs py-1.5 rounded bg-pink-800/50 hover:bg-pink-700/60 text-pink-200 border border-pink-700/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 border border-slate-700/60 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Brand SVG icons ───────────────────────────────────────────────────────────

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

function GoogleContactsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FamilyMapPanelProps {
  familyId: string;
  onClose: () => void;
}

type EditState =
  | { type: 'none' }
  | { type: 'editing'; childId: string }
  | { type: 'adding' };

export default function FamilyMapPanel({ familyId, onClose }: FamilyMapPanelProps) {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<EditState>({ type: 'none' });
  const [draft, setDraft] = useState<ChildDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setEditState({ type: 'none' });
    fetch(`/api/crm/families/${familyId}`)
      .then((r) => r.json())
      .then(setFamily)
      .catch(() => setFamily(null))
      .finally(() => setLoading(false));
  }, [familyId]);

  async function refreshFamily() {
    const fresh = await fetch(`/api/crm/families/${familyId}`).then((r) => r.json());
    setFamily(fresh);
  }

  async function updateLineage(value: JewishLineage | '') {
    const lineage = value || null;
    await fetch(`/api/crm/families/${familyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jewish_lineage: lineage }),
    });
    setFamily((f) => f ? { ...f, jewish_lineage: lineage } : f);
  }

  async function saveChild() {
    if (!draft.first_name.trim()) return;
    setSaving(true);
    try {
      const by = draft.birth_year ? parseInt(draft.birth_year) : null;
      const payload = {
        family_id: familyId,
        first_name: draft.first_name.trim(),
        birth_year: by,
        // Store Jan 1 of birth year as the birthday placeholder when exact date is unknown
        birthday: by ? `${by}-01-01` : null,
        bar_mitzvah_parsha: draft.bar_mitzvah_parsha.trim() || null,
        gender: (draft.gender as ChildGender) || null,
      };

      if (editState.type === 'adding') {
        await fetch('/api/crm/children', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (editState.type === 'editing') {
        await fetch(`/api/crm/children/${editState.childId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      await refreshFamily();
      setEditState({ type: 'none' });
      setDraft(EMPTY_DRAFT);
    } finally {
      setSaving(false);
    }
  }

  async function deleteChild(childId: string) {
    await fetch(`/api/crm/children/${childId}`, { method: 'DELETE' });
    await refreshFamily();
  }

  function cancelEdit() {
    setEditState({ type: 'none' });
    setDraft(EMPTY_DRAFT);
  }

  // Derive the "primary" name: mother is the halachic and domestic anchor
  const primaryName = family
    ? `${family.mother_first_name ?? family.father_first_name ?? ''} ${family.family_name}`.trim()
    : '';

  const socialSearchName = family
    ? `${family.mother_first_name ?? family.father_first_name ?? ''} ${family.family_name}`.trim()
    : '';

  return (
    <div className="absolute top-4 right-4 z-20 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden crm-panel-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-pink-950/40 border-b border-pink-800/30">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-semibold text-slate-100">
            {loading ? 'Loading…' : family ? `${family.family_name} Family` : 'Family'}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-slate-500">Loading…</div>
      ) : !family ? (
        <div className="p-6 text-center text-xs text-slate-500">Family not found</div>
      ) : (
        <div className="p-4 space-y-3 text-sm max-h-[80vh] overflow-y-auto">

          {/* ── Core identity ─────────────────────────────────────── */}
          <div>
            {/* Mother — primary contact and halachic anchor */}
            <div className="flex items-center gap-2 flex-wrap">
              {family.mother_first_name ? (
                <span className="text-sm font-semibold text-slate-100">
                  {family.mother_first_name} {family.family_name}
                </span>
              ) : family.father_first_name ? (
                <span className="text-sm font-semibold text-slate-100">
                  {family.father_first_name} {family.family_name}
                </span>
              ) : null}

              {/* Jewish lineage — inline editable */}
              <select
                value={family.jewish_lineage ?? ''}
                onChange={(e) => updateLineage(e.target.value as JewishLineage | '')}
                className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700/60 bg-slate-900/60 text-purple-300 focus:outline-none focus:border-purple-700/60 cursor-pointer"
              >
                <option value="" className="text-slate-400">Lineage…</option>
                {JEWISH_LINEAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="text-slate-100 bg-slate-800">{opt}</option>
                ))}
              </select>
            </div>

            {/* Father — metadata */}
            {family.father_first_name && family.mother_first_name && (
              <div className="text-[11px] text-slate-500 mt-0.5">
                Father: {family.father_first_name} {family.family_name}
              </div>
            )}
          </div>

          {/* ── Badges ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                family.status === 'active'
                  ? 'bg-green-900/50 text-green-400'
                  : family.status === 'prospect'
                  ? 'bg-yellow-900/50 text-yellow-400'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {family.status}
            </span>
            {family.affiliation && (
              <span className="text-[10px] text-slate-500">{family.affiliation}</span>
            )}
          </div>

          {/* Labels */}
          {family.labels && family.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {family.labels.map((lbl) => (
                <span
                  key={lbl}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${labelColor(lbl)}20`,
                    color: labelColor(lbl),
                    border: `1px solid ${labelColor(lbl)}40`,
                  }}
                >
                  {lbl}
                </span>
              ))}
            </div>
          )}

          {/* ── Location & contact ───────────────────────────────── */}
          {(family.city || family.state_province) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              {[family.city, family.state_province, family.country].filter(Boolean).join(', ')}
            </div>
          )}
          {family.email && (
            <a
              href={`mailto:${family.email}`}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {family.email}
            </a>
          )}
          {family.phone && (
            <a
              href={`tel:${family.phone}`}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              {family.phone}
            </a>
          )}

          {/* ── Notes ───────────────────────────────────────────── */}
          {family.notes && (
            <p className="text-xs text-slate-500 italic border-t border-slate-700/60 pt-2">
              {family.notes}
            </p>
          )}

          {/* ── Children ─────────────────────────────────────────── */}
          <div className="border-t border-slate-700/60 pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-medium">
                Children ({family.children.length})
              </span>
              {editState.type !== 'adding' && (
                <button
                  onClick={() => {
                    setEditState({ type: 'adding' });
                    setDraft(EMPTY_DRAFT);
                  }}
                  className="flex items-center gap-0.5 text-[10px] text-slate-600 hover:text-pink-400 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add child
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {family.children.map((c) => {
                const by = childBirthYear(c);
                const grade = by != null ? gradeFromBirthYear(by) : null;
                const isEditing = editState.type === 'editing' && editState.childId === c.id;

                return (
                  <div key={c.id}>
                    <div className="group flex items-center gap-1.5 px-1 py-1 rounded hover:bg-slate-700/30 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500/60 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xs text-slate-300 truncate max-w-[110px]">
                            {c.first_name}
                          </span>
                          {by != null && (
                            <span className="text-[10px] text-slate-500 shrink-0">
                              {gradeLabel(grade)} · {ageFromBirthYear(by)}y
                            </span>
                          )}
                        </div>
                        {c.bar_mitzvah_parsha && (
                          <div className="text-[10px] text-purple-400/80 mt-0.5">
                            ✡ {c.bar_mitzvah_parsha}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => {
                            setEditState({ type: 'editing', childId: c.id });
                            setDraft(draftFromChild(c));
                          }}
                          className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteChild(c.id)}
                          className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-700/50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <ChildForm
                        draft={draft}
                        onChange={setDraft}
                        onSave={saveChild}
                        onCancel={cancelEdit}
                        saving={saving}
                      />
                    )}
                  </div>
                );
              })}

              {editState.type === 'adding' && (
                <ChildForm
                  draft={draft}
                  onChange={setDraft}
                  onSave={saveChild}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              )}
            </div>
          </div>

          {/* ── Quick Lookup ──────────────────────────────────────── */}
          <div className="border-t border-slate-700/60 pt-3 space-y-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Quick Lookup
            </p>

            {/* Source of Truth */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Source of Truth</p>
              <PopupButton
                label="Google Contacts"
                sublabel={`Search "${[family.mother_first_name, family.father_first_name, family.family_name].filter(Boolean).join(' / ')}"`}
                url={googleContactsUrl(primaryName)}
                color="#34A853"
                icon={
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: '#34A853' }}>
                    <GoogleContactsIcon />
                  </span>
                }
              />
            </div>

            {/* Social */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Social</p>
              <div className="grid grid-cols-4 gap-2">
                <SocialIconButton
                  icon={<FacebookIcon />}
                  label="Facebook"
                  url={facebookUrl(family.family_name, family.city)}
                  color="#1877F2"
                />
                <SocialIconButton
                  icon={<InstagramIcon />}
                  label="Instagram"
                  url={instagramUrl(socialSearchName)}
                  color="#E4405F"
                />
                <SocialIconButton
                  icon={<WhatsAppIcon />}
                  label="WhatsApp"
                  url={whatsappUrl(family.phone)}
                  color="#25D366"
                />
                <SocialIconButton
                  icon={<GmailIcon />}
                  label="Gmail"
                  url={gmailUrl(family.email, socialSearchName)}
                  color="#EA4335"
                />
              </div>
            </div>

            {/* People Search */}
            {(family.mother_first_name || family.father_first_name) && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">People Search</p>
                {family.mother_first_name && (
                  <PopupButton
                    label={`${family.mother_first_name} ${family.family_name}`}
                    sublabel="truepeoplesearch.com"
                    url={personSearchUrl(family.mother_first_name, family.family_name, family.city, family.state_province)}
                    color="#8B5CF6"
                  />
                )}
                {family.father_first_name && (
                  <PopupButton
                    label={`${family.father_first_name} ${family.family_name}`}
                    sublabel="truepeoplesearch.com"
                    url={personSearchUrl(family.father_first_name, family.family_name, family.city, family.state_province)}
                    color="#6366F1"
                  />
                )}
              </div>
            )}
          </div>

          {/* CRM link */}
          <Link
            href={`/crm/${family.id}`}
            className="flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 transition-colors pt-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View full profile in CRM
          </Link>
        </div>
      )}
    </div>
  );
}
