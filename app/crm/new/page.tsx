'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, ChevronDown } from 'lucide-react';
import { JEWISH_LINEAGE_OPTIONS } from '@/types/crm';

interface ChildDraft {
  first_name: string;
  birthday: string;
  birth_year: string;
  gender: string;
  notes: string;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
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

function Sel({
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

const emptyChild = (): ChildDraft => ({
  first_name: '',
  birthday: '',
  birth_year: '',
  gender: '',
  notes: '',
});

export default function NewFamilyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [children, setChildren] = useState<ChildDraft[]>([]);

  const [form, setForm] = useState({
    family_name: '',
    father_first_name: '',
    mother_first_name: '',
    email: '',
    phone: '',
    city: '',
    state_province: '',
    country: '',
    program: '',
    status: 'active',
    enrollment_date: '',
    jewish_lineage: '',
    affiliation: '',
    notes: '',
  });

  const set = (key: string) => (v: string) => setForm((p) => ({ ...p, [key]: v }));

  const addChild = () => setChildren((p) => [...p, emptyChild()]);
  const removeChild = (i: number) => setChildren((p) => p.filter((_, idx) => idx !== i));
  const setChild = (i: number, key: keyof ChildDraft) => (v: string) =>
    setChildren((p) => p.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.family_name.trim()) return;
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      jewish_lineage: form.jewish_lineage || null,
      enrollment_date: form.enrollment_date || null,
      children: children
        .filter((c) => c.first_name.trim())
        .map((c) => ({
          first_name: c.first_name.trim(),
          birthday: c.birthday || null,
          birth_year: c.birthday
            ? new Date(c.birthday).getFullYear()
            : c.birth_year
            ? parseInt(c.birth_year, 10)
            : null,
          gender: c.gender || null,
          notes: c.notes || null,
        })),
    };

    try {
      const res = await fetch('/api/crm/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Save failed');
      }
      router.push('/crm');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-sm font-bold text-slate-200 mb-5">Add Family</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Family identity */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 space-y-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Family</p>
          <div>
            <Label required>Family Name</Label>
            <Input value={form.family_name} onChange={set('family_name')} placeholder="Cohen" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Father's First Name</Label>
              <Input value={form.father_first_name} onChange={set('father_first_name')} placeholder="Moshe" />
            </div>
            <div>
              <Label>Mother's First Name</Label>
              <Input value={form.mother_first_name} onChange={set('mother_first_name')} placeholder="Rivka" />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 space-y-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Contact</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={set('email')} type="email" placeholder="email@example.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={set('city')} placeholder="Brooklyn" />
            </div>
            <div>
              <Label>State / Province</Label>
              <Input value={form.state_province} onChange={set('state_province')} placeholder="NY" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={set('country')} placeholder="USA" />
            </div>
          </div>
        </section>

        {/* Jewish background */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 space-y-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Jewish Background</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jewish Lineage</Label>
              <Sel value={form.jewish_lineage} onChange={set('jewish_lineage')}>
                <option value="">— Not specified —</option>
                {JEWISH_LINEAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </Sel>
            </div>
            <div>
              <Label>Affiliation</Label>
              <Input value={form.affiliation} onChange={set('affiliation')} placeholder="e.g. Chabad, Reform…" />
            </div>
          </div>
        </section>

        {/* Program */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 space-y-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Enrollment</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Program</Label>
              <Input value={form.program} onChange={set('program')} placeholder="After School" />
            </div>
            <div>
              <Label>Status</Label>
              <Sel value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="inactive">Inactive</option>
              </Sel>
            </div>
          </div>
          <div>
            <Label>Enrollment Date</Label>
            <Input value={form.enrollment_date} onChange={set('enrollment_date')} type="date" />
          </div>
          <div>
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              rows={2}
              placeholder="Any notes…"
              className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </section>

        {/* Children */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Children</p>
            <button
              type="button"
              onClick={addChild}
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add child
            </button>
          </div>

          {children.length === 0 && (
            <p className="text-[10px] text-slate-600 italic">No children added yet.</p>
          )}

          <div className="space-y-4">
            {children.map((c, i) => (
              <div key={i} className="border border-slate-700/40 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Child {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeChild(i)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>First Name</Label>
                    <Input value={c.first_name} onChange={setChild(i, 'first_name')} placeholder="Name" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Sel value={c.gender} onChange={setChild(i, 'gender')}>
                      <option value="">—</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Sel>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Birthday</Label>
                    <Input value={c.birthday} onChange={setChild(i, 'birthday')} type="date" />
                  </div>
                  <div>
                    <Label>Birth Year (if no full date)</Label>
                    <Input
                      value={c.birthday ? String(new Date(c.birthday).getFullYear()) : c.birth_year}
                      onChange={setChild(i, 'birth_year')}
                      placeholder="e.g. 2018"
                      type="number"
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={c.notes} onChange={setChild(i, 'notes')} placeholder="Optional" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push('/crm')}
            className="text-xs px-4 py-2 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.family_name.trim()}
            className="text-xs px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Family'}
          </button>
        </div>
      </form>
    </div>
  );
}
