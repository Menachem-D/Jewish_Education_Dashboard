import Link from 'next/link';
import type { ReactNode } from 'react';

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-700/80 bg-slate-900/95 px-5 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors"
          >
            ← Map
          </Link>
          <span className="text-slate-700">|</span>
          <h1 className="text-xs font-bold text-slate-200 tracking-widest uppercase">
            Family CRM
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm/google-sync"
            className="text-xs px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Google Sync
          </Link>
          <Link
            href="/crm/duplicates"
            className="text-xs px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Duplicates
          </Link>
          <Link
            href="/crm/upload"
            className="text-xs px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            CSV Upload
          </Link>
          <Link
            href="/crm/new"
            className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            + Add Family
          </Link>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
