'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, MapPin, Phone, Mail, Users, ExternalLink } from 'lucide-react';
import type { Family } from '@/types/crm';
import PopupButton from '@/components/ui/PopupButton';

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

interface FamilyMapPanelProps {
  familyId: string;
  onClose: () => void;
}

export default function FamilyMapPanel({ familyId, onClose }: FamilyMapPanelProps) {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/crm/families/${familyId}`)
      .then((r) => r.json())
      .then(setFamily)
      .catch(() => setFamily(null))
      .finally(() => setLoading(false));
  }, [familyId]);

  return (
    <div className="absolute top-4 right-4 z-20 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden crm-panel-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-pink-950/40 border-b border-pink-800/30">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-semibold text-slate-100">
            {loading
              ? 'Loading…'
              : family
              ? `${family.family_name} Family`
              : 'Family'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-slate-500">Loading…</div>
      ) : !family ? (
        <div className="p-6 text-center text-xs text-slate-500">Family not found</div>
      ) : (
        <div className="p-4 space-y-3 text-sm max-h-[70vh] overflow-y-auto">
          {/* Status */}
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
            {family.jewish_lineage && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                {family.jewish_lineage}
              </span>
            )}
            {family.affiliation && (
              <span className="text-[10px] text-slate-500">{family.affiliation}</span>
            )}
          </div>

          {/* Parents */}
          <div className="space-y-1">
            {family.father_first_name && (
              <div className="text-slate-300 text-xs">
                <span className="text-slate-500 mr-1">Father:</span>
                {family.father_first_name} {family.family_name}
              </div>
            )}
            {family.mother_first_name && (
              <div className="text-slate-300 text-xs">
                <span className="text-slate-500 mr-1">Mother:</span>
                {family.mother_first_name} {family.family_name}
              </div>
            )}
          </div>

          {/* Location */}
          {(family.city || family.state_province) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              {[family.city, family.state_province, family.country].filter(Boolean).join(', ')}
            </div>
          )}

          {/* Contact */}
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

          {/* Children */}
          {family.children.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1.5">
                Children ({family.children.length})
              </div>
              <div className="space-y-1">
                {family.children.map((c) => {
                  const age = c.birthday
                    ? Math.floor(
                        (Date.now() - new Date(c.birthday).getTime()) /
                          (365.25 * 86400000),
                      )
                    : c.birth_year != null
                    ? new Date().getFullYear() - c.birth_year
                    : null;
                  return (
                    <div key={c.id} className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-pink-500/60 shrink-0" />
                      {c.first_name}
                      {age != null && (
                        <span className="text-slate-600">({age}y)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {family.notes && (
            <p className="text-xs text-slate-500 italic border-t border-slate-700/60 pt-2">
              {family.notes}
            </p>
          )}

          {/* Quick Lookup */}
          <div className="border-t border-slate-700/60 pt-2 space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
              Quick Lookup
            </p>
            {family.father_first_name && (
              <PopupButton
                label={`${family.father_first_name} ${family.family_name}`}
                sublabel="truepeoplesearch.com"
                url={personSearchUrl(family.father_first_name, family.family_name, family.city, family.state_province)}
                color="#6366F1"
              />
            )}
            {family.mother_first_name && (
              <PopupButton
                label={`${family.mother_first_name} ${family.family_name}`}
                sublabel="truepeoplesearch.com"
                url={personSearchUrl(family.mother_first_name, family.family_name, family.city, family.state_province)}
                color="#8B5CF6"
              />
            )}
            <PopupButton
              label="Facebook Search"
              sublabel={`"${family.family_name}"${family.city ? ` · ${family.city}` : ''}`}
              url={facebookUrl(family.family_name, family.city)}
              color="#3B82F6"
            />
            {family.father_first_name && (
              <PopupButton
                label={`Messenger — ${family.father_first_name} ${family.family_name}`}
                sublabel="facebook.com/search/people"
                url={`https://www.facebook.com/search/people/?q=${encodeURIComponent(`${family.father_first_name} ${family.family_name}`)}`}
                color="#A855F7"
              />
            )}
            {family.mother_first_name && (
              <PopupButton
                label={`Messenger — ${family.mother_first_name} ${family.family_name}`}
                sublabel="facebook.com/search/people"
                url={`https://www.facebook.com/search/people/?q=${encodeURIComponent(`${family.mother_first_name} ${family.family_name}`)}`}
                color="#A855F7"
              />
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
