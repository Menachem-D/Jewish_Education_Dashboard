'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, LogOut, Users, Loader2, Tag } from 'lucide-react';
import { Suspense } from 'react';

interface ContactGroup {
  name: string;
  resourceName: string;
  memberCount: number;
}

interface SyncStatus {
  connected: boolean;
  groups?: ContactGroup[];
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}

// ── Google logo SVG ───────────────────────────────────────────────────────────

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function GoogleSyncInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');

  const justConnected = searchParams.get('connected') === '1';
  const rawError = searchParams.get('error');
  const authError = rawError;
  const notConfigured = rawError === 'not_configured' || rawError === 'config_error';

  const fetchStatus = useCallback(() => {
    fetch('/api/crm/google-sync')
      .then((r) => r.json())
      .then((data: SyncStatus) => {
        setStatus(data);
        if (data.groups?.length) setSelectedGroup(data.groups[0].resourceName);
      })
      .catch(() => setStatus({ connected: false }));
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  async function doSync() {
    if (!selectedGroup) return;
    setSyncing(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/crm/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceName: selectedGroup }),
      });
      if (!res.ok) throw new Error('Sync failed');
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    await fetch('/api/crm/google-sync', { method: 'DELETE' });
    setStatus({ connected: false });
    setResult(null);
    setSelectedGroup('');
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-700/40">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/crm" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-bold text-slate-100 tracking-wide">
            Google Contacts Sync
          </h1>
          {status?.connected && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-700/40 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-600 pl-7">
          Import families from a Google Contacts label into your CRM. Existing records are updated, not duplicated.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
        <div className="max-w-lg space-y-5">

          {/* Not configured error — credentials missing */}
          {notConfigured && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Google credentials not configured
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Add these three lines to your <code className="text-blue-400">.env.local</code> file (in the project root), then restart the dev server:
              </p>
              <div className="bg-slate-950 rounded p-3 font-mono text-[10px] text-green-400 space-y-0.5">
                <p>GOOGLE_CLIENT_ID=<span className="text-slate-500">your_client_id</span></p>
                <p>GOOGLE_CLIENT_SECRET=<span className="text-slate-500">your_client_secret</span></p>
                <p>GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback</p>
              </div>
              <p className="text-[10px] text-slate-500">
                Get these from{' '}
                <strong className="text-slate-400">console.cloud.google.com</strong> →
                APIs &amp; Services → Credentials → Create OAuth 2.0 Client ID (Web application).
                Enable the <strong className="text-slate-400">People API</strong> first.
              </p>
            </div>
          )}

          {/* Auth error */}
          {authError && !notConfigured && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Google authorization was denied or failed. Please try again.
            </div>
          )}

          {/* Just connected success */}
          {justConnected && !authError && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 border border-green-800/40 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Connected to Google Contacts successfully.
            </div>
          )}

          {/* Loading */}
          {status === null && (
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking connection…
            </div>
          )}

          {/* NOT connected */}
          {status !== null && !status.connected && (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <GoogleIcon size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Connect Google Contacts</p>
                  <p className="text-[10px] text-slate-500">
                    Read-only access. We never modify your Google Contacts.
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1.5 bg-slate-900/40 rounded-lg p-3">
                <p className="font-medium text-slate-400">Before connecting, make sure you have:</p>
                <p>1. A Google Cloud project with <strong className="text-slate-300">People API</strong> enabled</p>
                <p>2. OAuth 2.0 credentials in your <code className="text-blue-400">.env.local</code>:</p>
                <div className="bg-slate-950 rounded p-2 font-mono text-[10px] text-green-400 mt-1 space-y-0.5">
                  <p>GOOGLE_CLIENT_ID=your_client_id</p>
                  <p>GOOGLE_CLIENT_SECRET=your_client_secret</p>
                  <p>GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback</p>
                </div>
                <p className="text-slate-600 pt-1">
                  See the README for the 5-minute Google Cloud Console setup guide.
                </p>
              </div>

              <a
                href="/api/auth/google"
                className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-lg bg-white text-slate-800 font-semibold text-sm hover:bg-slate-100 transition-colors shadow"
              >
                <GoogleIcon size={18} />
                Sign in with Google
              </a>
            </div>
          )}

          {/* CONNECTED */}
          {status?.connected && (
            <div className="space-y-4">
              {/* Label selector */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-200">Select a Contact Label</p>
                </div>

                {(status.groups ?? []).length === 0 ? (
                  <p className="text-xs text-slate-600 italic">
                    No custom labels found in your Google Contacts.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {status.groups!.map((g) => (
                      <button
                        key={g.resourceName}
                        onClick={() => setSelectedGroup(g.resourceName)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                          selectedGroup === g.resourceName
                            ? 'border-blue-500/60 bg-blue-900/20 text-slate-100'
                            : 'border-slate-700/60 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            selectedGroup === g.resourceName ? 'bg-blue-400' : 'bg-slate-600'
                          }`}
                        />
                        <span className="flex-1 text-xs font-medium">{g.name}</span>
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {g.memberCount}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* What happens info */}
              <div className="text-[10px] text-slate-600 bg-slate-900/40 rounded-lg px-4 py-3 space-y-1">
                <p className="font-medium text-slate-500">How sync works:</p>
                <p>• Contacts matching an existing family by email or phone → fields are patched (empty fields only)</p>
                <p>• New contacts → new families are created</p>
                <p>• Your existing CRM data is never overwritten</p>
              </div>

              {/* Sync button */}
              <button
                onClick={doSync}
                disabled={!selectedGroup || syncing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-40 transition-colors"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing contacts…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sync selected label
                  </>
                )}
              </button>

              {/* Sync error */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Sync result */}
              {result && (
                <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Sync complete — {result.total} contact{result.total !== 1 ? 's' : ''} processed
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { label: 'Created', value: result.created, color: 'text-green-400' },
                      { label: 'Updated', value: result.updated, color: 'text-blue-400' },
                      { label: 'Skipped', value: result.skipped, color: 'text-slate-500' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-slate-900/60 rounded-lg px-3 py-2 text-center">
                        <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
                        <div className="text-[10px] text-slate-600">{label}</div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/crm"
                    className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors pt-1"
                  >
                    View families in CRM →
                  </Link>
                </div>
              )}

              {/* Disconnect */}
              <div className="pt-2 border-t border-slate-700/40">
                <button
                  onClick={disconnect}
                  className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect Google account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page wrapper (Suspense required for useSearchParams) ──────────────────────

export default function GoogleSyncPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-600 text-sm">Loading…</div>}>
      <GoogleSyncInner />
    </Suspense>
  );
}
