'use client';

import { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Mail,
  Phone,
  Globe,
  ExternalLink as LinkIcon,
  Loader2,
} from 'lucide-react';
import { MapRecord, LAYER_COLORS, LAYER_LABELS } from '@/types/map-record';
import PopupButton from '@/components/ui/PopupButton';

interface DetailPanelProps {
  record: MapRecord;
  onClose: () => void;
}

interface EnrichedData {
  website: string | null;
  phone: string | null;
  address: string | null;
  rabbi_director: string | null;
  founded: string | null;
  description: string | null;
}

interface EnrichResult {
  data: EnrichedData | null;
  sources: { title: string; url: string }[];
  skipped?: boolean;
  error?: string;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs text-slate-200">{value}</div>
    </div>
  );
}

function ContactRow({
  href,
  icon: Icon,
  label,
  display,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  display: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 py-1.5 border-b border-slate-800/60 last:border-0 transition-colors group"
    >
      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-blue-400" />
      <span className="truncate group-hover:underline">{display}</span>
    </a>
  );
}

/** Build truepeoplesearch URL from record name + location. */
function buildPersonSearchUrl(record: MapRecord): string {
  const clean = record.name
    .replace(/^(Rabbi|Rebbetzin|Dr\.|Mr\.|Mrs\.|Rev\.)\s+/i, '')
    .trim();
  const loc = [record.city, record.state_province].filter(Boolean).join(' ');
  return (
    `https://www.truepeoplesearch.com/results` +
    `?name=${encodeURIComponent(clean)}` +
    `&citystatezip=${encodeURIComponent(loc)}`
  );
}

export default function DetailPanel({ record, onClose }: DetailPanelProps) {
  const color = LAYER_COLORS[record.layer_type] ?? '#94A3B8';
  const location = [record.city, record.state_province, record.country]
    .filter(Boolean)
    .join(', ');

  const hasContacts = record.email || record.whatsapp;

  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);

  useEffect(() => {
    if (record.layer_type === 'population') return;

    const controller = new AbortController();
    setEnriching(true);
    setEnrichResult(null);

    fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: record.name,
        city: record.city,
        state_province: record.state_province,
        country: record.country,
        layer_type: record.layer_type,
      }),
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<EnrichResult>)
      .then((result) => setEnrichResult(result))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setEnrichResult({ data: null, sources: [], error: 'Lookup failed' });
        }
      })
      .finally(() => setEnriching(false));

    return () => controller.abort();
  }, [record.id]);

  const enriched = enrichResult?.data;
  const hasEnriched =
    enriched && Object.values(enriched).some((v) => v != null && v !== '');

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
    [record.name, record.city, record.state_province].filter(Boolean).join(' '),
  )}`;

  const facebookUrl = `https://www.facebook.com/search/top/?q=${encodeURIComponent(
    [record.name, record.city].filter(Boolean).join(' '),
  )}`;

  return (
    <div className="absolute top-0 right-0 h-full w-76 bg-slate-900/96 backdrop-blur-sm border-l border-slate-700/80 flex flex-col overflow-hidden z-10 shadow-2xl">
      {/* Colored top bar + header */}
      <div
        className="px-4 py-3 border-b border-slate-700/80"
        style={{ borderTopColor: color, borderTopWidth: '3px' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-100 leading-tight mb-1.5">
              {record.name}
            </h2>
            <span
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border leading-none"
              style={{
                backgroundColor: `${color}20`,
                color,
                borderColor: `${color}50`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {LAYER_LABELS[record.layer_type]}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-slate-700/50 transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Location */}
        <div className="px-4 py-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span>{location}</span>
          </div>
          {record.metro_area && (
            <div className="text-[10px] text-slate-600 mt-0.5 pl-5">
              Metro: {record.metro_area}
            </div>
          )}
        </div>

        {/* Population stats */}
        {record.layer_type === 'population' && record.population != null && (
          <div className="px-4 py-3 border-b border-slate-800/80">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
              Jewish Population
            </p>
            <div className="text-2xl font-bold tabular-nums" style={{ color }}>
              {record.population.toLocaleString()}
            </div>
          </div>
        )}

        {/* Affiliation */}
        {record.affiliation && (
          <div className="px-4 py-3 border-b border-slate-800/80">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
              Details
            </p>
            <Field label="Affiliation" value={record.affiliation} />
          </div>
        )}

        {/* Contact info */}
        {hasContacts && (
          <div className="px-4 py-3 border-b border-slate-800/80">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
              Contact
            </p>
            {record.email && (
              <ContactRow
                href={`mailto:${record.email}`}
                icon={Mail}
                label="Email"
                display={record.email}
              />
            )}
            {record.whatsapp && (
              <ContactRow
                href={`https://wa.me/${record.whatsapp.replace(/\D/g, '')}`}
                icon={Phone}
                label="WhatsApp"
                display={record.whatsapp}
              />
            )}
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div className="px-4 py-3 border-b border-slate-800/80">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
              Notes
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">{record.notes}</p>
          </div>
        )}

        {/* Web Info */}
        {record.layer_type !== 'population' && (
          <div className="px-4 py-3 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                Web Info
              </p>
              {enriching && <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />}
            </div>

            {enriching && (
              <p className="text-[10px] text-slate-600 italic">Looking up online…</p>
            )}

            {!enriching && enrichResult?.error && (
              <p className="text-[10px] text-slate-700 italic">{enrichResult.error}</p>
            )}

            {!enriching && hasEnriched && enriched && (
              <div className="space-y-2">
                {enriched.description && (
                  <p className="text-xs text-slate-400 leading-relaxed">{enriched.description}</p>
                )}
                <div className="space-y-1.5 mt-1">
                  <Field label="Rabbi / Director" value={enriched.rabbi_director} />
                  <Field label="Address" value={enriched.address} />
                  <Field label="Phone" value={enriched.phone} />
                  <Field label="Founded" value={enriched.founded} />
                </div>
                {enriched.website && (
                  <a
                    href={enriched.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-1 group"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-blue-400" />
                    <span className="truncate group-hover:underline">{enriched.website}</span>
                  </a>
                )}
                {enrichResult?.sources && enrichResult.sources.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-[10px] text-slate-700 cursor-pointer hover:text-slate-500 select-none">
                      Sources ({enrichResult.sources.length})
                    </summary>
                    <div className="mt-1.5 space-y-1">
                      {enrichResult.sources.map((s, i) => (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-1 text-[10px] text-slate-600 hover:text-slate-400 group"
                        >
                          <LinkIcon className="w-3 h-3 shrink-0 mt-0.5 group-hover:text-blue-400" />
                          <span className="truncate">{s.title}</span>
                        </a>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {!enriching && !enrichResult?.error && enrichResult && !hasEnriched && (
              <p className="text-[10px] text-slate-700 italic">No additional info found.</p>
            )}
          </div>
        )}

        {/* ── Quick Lookup — real browser popups, no bot risk ─────────── */}
        {record.layer_type !== 'population' && (
          <div className="px-4 py-3 border-b border-slate-800/80">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2.5">
              Quick Lookup
            </p>
            <div className="space-y-1.5">
              {record.layer_type === 'head_shliach' && (
                <PopupButton
                  label="People Search"
                  sublabel="truepeoplesearch.com"
                  url={buildPersonSearchUrl(record)}
                  color="#6366F1"
                />
              )}
              {record.layer_type !== 'head_shliach' && enriched?.website && (
                <PopupButton
                  label="Official Website"
                  sublabel={enriched.website}
                  url={enriched.website}
                  color="#22C55E"
                />
              )}
              {record.layer_type !== 'head_shliach' && (
                <PopupButton
                  label="Facebook Search"
                  sublabel={`"${record.name}"`}
                  url={facebookUrl}
                  color="#3B82F6"
                />
              )}
              <PopupButton
                label="Google Search"
                sublabel={`${record.name}${record.city ? ` · ${record.city}` : ''}`}
                url={googleUrl}
                color="#94A3B8"
              />
            </div>
          </div>
        )}

        {/* Raw fields */}
        {record.raw && Object.keys(record.raw).length > 0 && (
          <details className="px-4 py-3">
            <summary className="text-[10px] font-semibold text-slate-700 uppercase tracking-widest cursor-pointer hover:text-slate-500 select-none">
              Raw data
            </summary>
            <div className="mt-2 space-y-1.5">
              {Object.entries(record.raw)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-[10px]">
                    <span className="text-slate-600 shrink-0 min-w-24 truncate">{k}</span>
                    <span className="text-slate-400 truncate">{v}</span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
