'use client';

import { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  to: string;
  toName: string;
  onClose: () => void;
}

export default function EmailModal({ to, toName, onClose }: Props) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/crm/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, toName, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send');
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
            <div>
              <p className="text-sm font-semibold text-slate-100">New Email</p>
              <p className="text-[10px] text-slate-500 mt-0.5">To: {toName} &lt;{to}&gt;</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-700/50">
              <X className="w-4 h-4" />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
              <p className="text-sm font-semibold text-slate-200">Email sent!</p>
              <p className="text-xs text-slate-500 text-center">Your message was delivered to {to}.</p>
              <button
                onClick={onClose}
                className="mt-2 text-xs px-4 py-2 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-5 py-4">
              {/* Subject */}
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject…"
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={7}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!subject.trim() || !body.trim() || sending}
                  className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors font-medium"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
