'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, X, ChevronDown, Trash2, Pencil, Check } from 'lucide-react';
import type { Family, Child } from '@/types/crm';
import { JEWISH_LINEAGE_OPTIONS } from '@/types/crm';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400',
  inactive: 'text-slate-500',
  prospect: 'text-yellow-400',
};

function calcAge(birthday: string): string {
  const b = new Date(birthday);
  const now = new Date();
  let y = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) y--;
  return y < 1 ? '< 1y' : `${y}y`;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
      {children}
    </label>
  );
}

function FInput({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
    />
  );
}

function FSel({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full text-xs bg-slate-800 border border-slate-700 rounded pl-3 pr-7 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
    </div>
  );
}

export default function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [addingChild, setAddingChild] = useState(false);
  const [newChild, setNewChild] = useState({ first_name: '', birthday: '', birth_year: '', gender: '', notes: '' });
  const [childSaving, setChildSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/crm/families/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setFamily(data);
        setForm({
          family_name: data.family_name ?? '',
          father_first_name: data.father_first_name ?? '',
          mother_first_name: data.mother_first_name ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          city: data.city ?? '',
          state_province: data.state_province ?? '',
          country: data.country ?? '',
          program: data.program ?? '',
          status: data.status ?? 'active',
          enrollment_date: data.enrollment_date ?? '',
          jewish_lineage: data.jewish_lineage ?? '',
          affiliation: data.affiliation ?? '',
          notes: data.notes ?? '',
          facebook_url: data.facebook_url ?? '',
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key: string) => (v: string) => setForm((p) => ({ ...p, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      jewish_lineage: form.jewish_lineage || null,
      enrollment_date: form.enrollment_date || null,
    };
    const res = await fetch(`/api/crm/families/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setFamily((prev) => ({ ...(prev as Family), ...updated }));
      setEditing(false);
    }
    setSaving(false);
  };

  const handleAddChild = async () => {
    if (!newChild.first_name.trim()) return;
    setChildSaving(true);
    const birthYear = newChild.birthday
      ? new Date(newChild.birthday).getFullYear()
      : newChild.birth_year
      ? parseInt(newChild.birth_year, 10)
      : null;

    const res = await fetch('/api/crm/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: id,
        first_name: newChild.first_name.trim(),
        birthday: newChild.birthday || null,
        birth_year: birthYear,
        gender: newChild.gender || null,
        notes: newChild.notes || null,
      }),
    });
    if (res.ok) {
      const child = await res.json();
      setFamily((prev) =>
        prev ? { ...prev, children: [...(prev.children ?? []), child] } : prev,
      );
      setNewChild({ first_name: '', birthday: '', birth_year: '', gender: '', notes: '' });
      setAddingChild(false);
    }
    setChildSaving(false);
  };

  const handleDeleteChild = async (childId: string) => {
    const res = await fetch(`/api/crm/children/${childId}`, { method: 'DELETE' });
    if (res.ok) {
      setFamily((prev) =>
        prev ? { ...prev, children: prev.children.filter((c) => c.id !== childId) } : prev,
      );
    }
  };

  const handleDeleteFamily = async () => {
    const res = await fetch(`/api/crm/families/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/crm');
  };

  if (loading) return <div className="text-center py-16 text-slate-600">Loading…</div>;
  if (error || !family) return <div className="text-center py-16 text-red-400">{error || 'Not found'}</div>;

  const locationStr = [family.city, family.state_province, family.country].filter(Boolean).join(', ');

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{family.family_name} Family</h2>
          {locationStr && <p className="text-xs text-slate-500 mt-0.5">{locationStr}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50">
                <Check className="w-3 h-3" />{saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-red-400">Delete?</span>
                  <button onClick={handleDeleteFamily} className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-400">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-slate-600 hover:text-red-400 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details section */}
      <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 space-y-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Details</p>
        {editing ? (
          <>
            <div>
              <Label>Family Name *</Label>
              <FInput value={form.family_name} onChange={set('family_name')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Father's First Name</Label><FInput value={form.father_first_name} onChange={set('father_first_name')} /></div>
              <div><Label>Mother's First Name</Label><FInput value={form.mother_first_name} onChange={set('mother_first_name')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><FInput value={form.email} onChange={set('email')} type="email" /></div>
              <div><Label>Phone</Label><FInput value={form.phone} onChange={set('phone')} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City</Label><FInput value={form.city} onChange={set('city')} /></div>
              <div><Label>State</Label><FInput value={form.state_province} onChange={set('state_province')} /></div>
              <div><Label>Country</Label><FInput value={form.country} onChange={set('country')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jewish Lineage</Label>
                <FSel value={form.jewish_lineage} onChange={set('jewish_lineage')}>
                  <option value="">— Not specified —</option>
                  {JEWISH_LINEAGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </FSel>
              </div>
              <div><Label>Affiliation</Label><FInput value={form.affiliation} onChange={set('affiliation')} placeholder="Chabad, Reform…" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Program</Label><FInput value={form.program} onChange={set('program')} />
              </div>
              <div>
                <Label>Status</Label>
                <FSel value={form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="prospect">Prospect</option>
                  <option value="inactive">Inactive</option>
                </FSel>
              </div>
            </div>
            <div><Label>Enrollment Date</Label><FInput value={form.enrollment_date} onChange={set('enrollment_date')} type="date" /></div>
            <div>
              <Label>Facebook Profile URL</Label>
              <FInput
                value={form.facebook_url}
                onChange={set('facebook_url')}
                placeholder="https://www.facebook.com/username"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <textarea value={form.notes} onChange={(e) => set('notes')(e.target.value)} rows={2}
                className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 resize-none" />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
            {([
              ['Father', [family.father_first_name, family.family_name].filter(Boolean).join(' ')],
              ['Mother', [family.mother_first_name, family.family_name].filter(Boolean).join(' ')],
              ['Email', family.email],
              ['Phone', family.phone],
              ['Location', locationStr],
              ['Jewish Lineage', family.jewish_lineage],
              ['Affiliation', family.affiliation],
              ['Program', family.program],
              ['Status', family.status],
              ['Enrolled', family.enrollment_date],
              ['Facebook', family.facebook_url],
            ] as [string, string | null][])
              .filter(([, v]) => v)
              .map(([label, val]) => (
                <div key={label}>
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">{label}</div>
                  <div className={label === 'Status' ? (STATUS_COLORS[val!] ?? 'text-slate-300') : 'text-slate-300'}>{val}</div>
                </div>
              ))}
            {family.notes && (
              <div className="col-span-2">
                <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Notes</div>
                <div className="text-slate-300 leading-relaxed">{family.notes}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Children */}
      <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Children ({family.children?.length ?? 0})
          </p>
          {!addingChild && (
            <button onClick={() => setAddingChild(true)} className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
              <Plus className="w-3 h-3" /> Add child
            </button>
          )}
        </div>

        {(family.children ?? []).length === 0 && !addingChild && (
          <p className="text-[10px] text-slate-600 italic">No children recorded.</p>
        )}

        <div className="space-y-2">
          {(family.children ?? []).map((c: Child) => {
            const ageStr = c.birthday
              ? calcAge(c.birthday)
              : c.birth_year
              ? `b. ${c.birth_year}`
              : null;
            const bdayDisplay = c.birthday
              ? new Date(c.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;

            return (
              <div key={c.id} className="flex items-start justify-between border border-slate-700/40 rounded px-3 py-2">
                <div>
                  <span className="text-xs text-slate-200 font-medium">{c.first_name}</span>
                  {c.gender && <span className="ml-2 text-[10px] text-slate-500">{c.gender}</span>}
                  {bdayDisplay && (
                    <span className="ml-2 text-[10px] text-slate-400">
                      {bdayDisplay}
                      {ageStr && <span className="ml-1 text-blue-400">({ageStr})</span>}
                    </span>
                  )}
                  {!bdayDisplay && ageStr && (
                    <span className="ml-2 text-[10px] text-slate-400">{ageStr}</span>
                  )}
                  {c.notes && <div className="text-[10px] text-slate-600 mt-0.5">{c.notes}</div>}
                </div>
                <button onClick={() => handleDeleteChild(c.id)} className="p-1 text-slate-700 hover:text-red-400 rounded transition-colors shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add child form */}
        {addingChild && (
          <div className="mt-3 border border-slate-700/40 rounded p-3 space-y-2">
            <p className="text-[10px] font-medium text-slate-500 mb-2">New Child</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>First Name</Label>
                <input autoFocus value={newChild.first_name}
                  onChange={(e) => setNewChild((p) => ({ ...p, first_name: e.target.value }))}
                  placeholder="Name"
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <Label>Gender</Label>
                <div className="relative">
                  <select value={newChild.gender} onChange={(e) => setNewChild((p) => ({ ...p, gender: e.target.value }))}
                    className="appearance-none w-full text-xs bg-slate-800 border border-slate-700 rounded pl-2.5 pr-6 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500">
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Birthday</Label>
                <input type="date" value={newChild.birthday}
                  onChange={(e) => setNewChild((p) => ({ ...p, birthday: e.target.value }))}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <Label>Birth Year (if no date)</Label>
                <input type="number" value={newChild.birthday ? String(new Date(newChild.birthday).getFullYear()) : newChild.birth_year}
                  onChange={(e) => setNewChild((p) => ({ ...p, birth_year: e.target.value }))}
                  placeholder="e.g. 2018"
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <input value={newChild.notes}
              onChange={(e) => setNewChild((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notes (optional)"
              className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAddingChild(false); setNewChild({ first_name: '', birthday: '', birth_year: '', gender: '', notes: '' }); }}
                className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleAddChild} disabled={childSaving || !newChild.first_name.trim()}
                className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50">
                {childSaving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
