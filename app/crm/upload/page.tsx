'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, ChevronDown, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildColGroup {
  first_name: string;
  birthday: string;
  birth_year: string;
  gender: string;
  notes: string;
}

interface ColMap {
  family_name: string;
  father_first_name: string;
  mother_first_name: string;
  email: string;
  phone: string;
  city: string;
  state_province: string;
  country: string;
  program: string;
  status: string;
  enrollment_date: string;
  jewish_lineage: string;
  affiliation: string;
  notes: string;
  children: ChildColGroup[];
}

interface ImportResult {
  created: number;
  errors: { row: number; error: string }[];
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const n = text.length;

  for (let i = 0; i <= n; i++) {
    const ch = i < n ? text[i] : '\n';
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell.trim());
        if (row.some((c) => c !== '')) lines.push(row);
        row = []; cell = '';
      } else { cell += ch; }
    }
  }

  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0];
  const rows = lines.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

// ─── Auto-detect column mapping ───────────────────────────────────────────────

const FAMILY_PATTERNS: [keyof Omit<ColMap, 'children'>, string[]][] = [
  ['family_name',        ['family', 'last', 'surname', 'family_name', 'lastname']],
  ['father_first_name',  ['father', 'dad', 'husband', 'father_first']],
  ['mother_first_name',  ['mother', 'mom', 'wife', 'mother_first']],
  ['email',              ['email', 'e-mail', 'mail']],
  ['phone',              ['phone', 'tel', 'mobile', 'cell']],
  ['city',               ['city', 'town']],
  ['state_province',     ['state', 'province', 'state_province']],
  ['country',            ['country']],
  ['program',            ['program', 'programme', 'class']],
  ['status',             ['status']],
  ['enrollment_date',    ['enrollment', 'enroll', 'joined', 'start']],
  ['jewish_lineage',     ['lineage', 'jewish', 'heritage', 'background']],
  ['affiliation',        ['affiliation', 'synagogue', 'shul']],
  ['notes',              ['notes', 'note', 'comments', 'remarks']],
];

function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function autoDetect(headers: string[]): ColMap {
  const match = (patterns: string[]) =>
    headers.find((h) => patterns.some((p) => norm(h).includes(norm(p)))) ?? '';

  const base = Object.fromEntries(
    FAMILY_PATTERNS.map(([key, pats]) => [key, match(pats)]),
  ) as Omit<ColMap, 'children'>;

  // Detect numbered child column groups
  const childNums = new Set<number>();
  for (const h of headers) {
    const m = norm(h).match(/child(\d+)/);
    if (m) childNums.add(parseInt(m[1], 10));
  }

  const children: ChildColGroup[] = [...childNums].sort((a, b) => a - b).map((n) => {
    const p = (terms: string[]) =>
      headers.find((h) => norm(h).startsWith(`child${n}`) && terms.some((t) => norm(h).includes(t))) ?? '';
    return {
      first_name: p(['name', 'first']),
      birthday: p(['birthday', 'dob', 'date']),
      birth_year: p(['year', 'birthyear', 'born']),
      gender: p(['gender', 'sex']),
      notes: p(['note', 'comment']),
    };
  });

  if (children.length === 0) {
    children.push({ first_name: '', birthday: '', birth_year: '', gender: '', notes: '' });
  }

  return { ...base, children };
}

// ─── Apply mapping to a CSV row ───────────────────────────────────────────────

function applyMapping(row: Record<string, string>, map: ColMap) {
  const get = (col: string) => (col ? (row[col] ?? '') : '');
  const str = (col: string) => get(col) || null;

  const family: Record<string, string | null> = {
    family_name: str('family_name') ? get(map.family_name) : null,
    father_first_name: str(map.father_first_name),
    mother_first_name: str(map.mother_first_name),
    email: str(map.email),
    phone: str(map.phone),
    city: str(map.city),
    state_province: str(map.state_province),
    country: str(map.country),
    program: str(map.program),
    status: get(map.status) || 'active',
    enrollment_date: str(map.enrollment_date),
    jewish_lineage: str(map.jewish_lineage),
    affiliation: str(map.affiliation),
    notes: str(map.notes),
  };
  family.family_name = get(map.family_name) || null;

  const children = map.children
    .map((cm) => {
      const firstName = get(cm.first_name);
      if (!firstName) return null;
      const bdayStr = get(cm.birthday);
      const yearStr = get(cm.birth_year);
      const birthYear = bdayStr
        ? new Date(bdayStr).getFullYear()
        : yearStr
        ? parseInt(yearStr, 10)
        : null;
      return {
        first_name: firstName,
        birthday: bdayStr || null,
        birth_year: isNaN(birthYear as number) ? null : birthYear,
        gender: get(cm.gender) || null,
        notes: get(cm.notes) || null,
      };
    })
    .filter(Boolean);

  return { family, children };
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function ColSelect({
  label,
  value,
  onChange,
  headers,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  headers: string[];
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="text-xs text-slate-400 w-40 shrink-0">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </div>
      <div className="relative flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full text-xs bg-slate-800 border border-slate-700/60 rounded pl-3 pr-7 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">— not mapped —</option>
          {headers.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'importing' | 'done';

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [parseError, setParseError] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColMap>({
    family_name: '', father_first_name: '', mother_first_name: '',
    email: '', phone: '', city: '', state_province: '', country: '',
    program: '', status: '', enrollment_date: '',
    jewish_lineage: '', affiliation: '', notes: '',
    children: [{ first_name: '', birthday: '', birth_year: '', gender: '', notes: '' }],
  });
  const [result, setResult] = useState<ImportResult | null>(null);

  // ── Step 1: parse file ───────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { headers, rows } = parseCsv(ev.target?.result as string);
        if (headers.length === 0) throw new Error('No headers found. Make sure row 1 is the header row.');
        if (rows.length === 0) throw new Error('No data rows found.');
        setCsvHeaders(headers);
        setCsvRows(rows);
        setMapping(autoDetect(headers));
        setStep('map');
      } catch (e: unknown) {
        setParseError(e instanceof Error ? e.message : 'Parse error');
      }
    };
    reader.readAsText(file);
  };

  // ── Mapping helpers ──────────────────────────────────────────────────────
  const setFamilyCol = (key: keyof Omit<ColMap, 'children'>) => (v: string) =>
    setMapping((p) => ({ ...p, [key]: v }));

  const setChildCol = (i: number, key: keyof ChildColGroup) => (v: string) =>
    setMapping((p) => ({
      ...p,
      children: p.children.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)),
    }));

  const addChildGroup = () =>
    setMapping((p) => ({
      ...p,
      children: [...p.children, { first_name: '', birthday: '', birth_year: '', gender: '', notes: '' }],
    }));

  const removeChildGroup = (i: number) =>
    setMapping((p) => ({ ...p, children: p.children.filter((_, idx) => idx !== i) }));

  // ── Preview rows (mapped) ────────────────────────────────────────────────
  const previewRows = csvRows
    .map((r) => applyMapping(r, mapping))
    .filter((r) => r.family.family_name);

  // ── Step 3: import ───────────────────────────────────────────────────────
  const handleImport = async () => {
    setStep('importing');
    try {
      const res = await fetch('/api/crm/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: previewRows }),
      });
      const data: ImportResult = await res.json();
      setResult(data);
      setStep('done');
    } catch {
      setResult({ created: 0, errors: [{ row: 0, error: 'Network error — check console' }] });
      setStep('done');
    }
  };

  const reset = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setResult(null);
    setParseError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Renders ──────────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h2 className="text-sm font-bold text-slate-200 mb-1">Bulk CSV Upload</h2>
        <p className="text-xs text-slate-500 mb-6">
          Upload any CSV file — you&apos;ll map your columns to CRM fields in the next step.
        </p>

        <div
          className="border-2 border-dashed border-slate-700 rounded-lg p-12 text-center cursor-pointer hover:border-blue-600/60 hover:bg-blue-950/10 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (!file) return;
            const dt = new DataTransfer();
            dt.items.add(file);
            if (fileRef.current) { fileRef.current.files = dt.files; fileRef.current.dispatchEvent(new Event('change', { bubbles: true })); }
          }}
        >
          <Upload className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Click or drag a CSV file here</p>
          <p className="text-[10px] text-slate-600 mt-1">Any column names — you will map them on the next screen</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </div>

        {parseError && (
          <div className="mt-4 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{parseError}
          </div>
        )}
      </div>
    );
  }

  if (step === 'map') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Map Your Columns</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {csvRows.length} rows detected · {csvHeaders.length} columns ·{' '}
              <span className="text-blue-400">{previewRows.length} families ready</span>
            </p>
          </div>
          <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Change file
          </button>
        </div>

        {/* Detected columns chip list */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {csvHeaders.map((h) => (
            <span key={h} className="text-[10px] bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full text-slate-400">
              {h}
            </span>
          ))}
        </div>

        {/* Family fields */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Family Fields</p>
          <ColSelect label="Family Name" value={mapping.family_name} onChange={setFamilyCol('family_name')} headers={csvHeaders} required />
          <ColSelect label="Father's First Name" value={mapping.father_first_name} onChange={setFamilyCol('father_first_name')} headers={csvHeaders} />
          <ColSelect label="Mother's First Name" value={mapping.mother_first_name} onChange={setFamilyCol('mother_first_name')} headers={csvHeaders} />
          <ColSelect label="Email" value={mapping.email} onChange={setFamilyCol('email')} headers={csvHeaders} />
          <ColSelect label="Phone" value={mapping.phone} onChange={setFamilyCol('phone')} headers={csvHeaders} />
          <ColSelect label="City" value={mapping.city} onChange={setFamilyCol('city')} headers={csvHeaders} />
          <ColSelect label="State / Province" value={mapping.state_province} onChange={setFamilyCol('state_province')} headers={csvHeaders} />
          <ColSelect label="Country" value={mapping.country} onChange={setFamilyCol('country')} headers={csvHeaders} />
          <ColSelect label="Program" value={mapping.program} onChange={setFamilyCol('program')} headers={csvHeaders} />
          <ColSelect label="Status" value={mapping.status} onChange={setFamilyCol('status')} headers={csvHeaders} />
          <ColSelect label="Enrollment Date" value={mapping.enrollment_date} onChange={setFamilyCol('enrollment_date')} headers={csvHeaders} />
          <ColSelect label="Jewish Lineage" value={mapping.jewish_lineage} onChange={setFamilyCol('jewish_lineage')} headers={csvHeaders} />
          <ColSelect label="Affiliation" value={mapping.affiliation} onChange={setFamilyCol('affiliation')} headers={csvHeaders} />
          <ColSelect label="Notes" value={mapping.notes} onChange={setFamilyCol('notes')} headers={csvHeaders} />
        </section>

        {/* Child column groups */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Children Columns
            </p>
            <button
              onClick={addChildGroup}
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add child group
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mb-3">
            Each group maps one child per row. Add a group for each child column set in your CSV.
          </p>
          {mapping.children.map((cg, i) => (
            <div key={i} className="border border-slate-700/40 rounded p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-slate-400">Child {i + 1}</span>
                {mapping.children.length > 1 && (
                  <button onClick={() => removeChildGroup(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <ColSelect label="First Name" value={cg.first_name} onChange={setChildCol(i, 'first_name')} headers={csvHeaders} />
              <ColSelect label="Birthday (full date)" value={cg.birthday} onChange={setChildCol(i, 'birthday')} headers={csvHeaders} />
              <ColSelect label="Birth Year (fallback)" value={cg.birth_year} onChange={setChildCol(i, 'birth_year')} headers={csvHeaders} />
              <ColSelect label="Gender" value={cg.gender} onChange={setChildCol(i, 'gender')} headers={csvHeaders} />
              <ColSelect label="Notes" value={cg.notes} onChange={setChildCol(i, 'notes')} headers={csvHeaders} />
            </div>
          ))}
        </section>

        {/* Live preview of first 4 rows */}
        {previewRows.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Preview (first rows)</p>
            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-slate-500 text-left">
                    <th className="px-3 py-2 font-medium">Family</th>
                    <th className="px-3 py-2 font-medium">Parents</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">Lineage</th>
                    <th className="px-3 py-2 font-medium">Children</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 4).map((r, i) => (
                    <tr key={i} className="border-t border-slate-800/60">
                      <td className="px-3 py-2 text-slate-200 font-medium">{r.family.family_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {[r.family.father_first_name, r.family.mother_first_name].filter(Boolean).join(' & ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {[r.family.city, r.family.state_province].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{r.family.jewish_lineage || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {(r.children as { first_name: string; birthday?: string | null; birth_year?: number | null }[]).length > 0
                          ? (r.children as { first_name: string; birthday?: string | null; birth_year?: number | null }[])
                              .map((c) => `${c.first_name}${c.birthday ? ` (${c.birthday})` : c.birth_year ? ` (${c.birth_year})` : ''}`)
                              .join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={reset} className="text-xs px-4 py-2 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!mapping.family_name || previewRows.length === 0}
            className="text-xs px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
          >
            Import {previewRows.length} families
          </button>
        </div>
      </div>
    );
  }

  if (step === 'importing') {
    return (
      <div className="text-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Importing families…</p>
      </div>
    );
  }

  // done
  return (
    <div className="max-w-md mx-auto p-6 space-y-3">
      {result && result.created > 0 && (
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 border border-green-800/40 rounded px-4 py-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{result.created} {result.created === 1 ? 'family' : 'families'} imported successfully.</span>
        </div>
      )}
      {result?.errors && result.errors.length > 0 && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-4 py-3 space-y-1">
          {result.errors.map((e, i) => (
            <div key={i}>{e.row > 0 ? `Row ${e.row}: ` : ''}{e.error}</div>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => router.push('/crm')} className="text-xs px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors">
          Go to CRM
        </button>
        <button onClick={reset} className="text-xs px-4 py-2 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
          Upload more
        </button>
      </div>
    </div>
  );
}
