'use client';

import { useState } from 'react';
import { X, Send, ExternalLink } from 'lucide-react';

interface Props {
  phone: string;
  toName: string;
  onClose: () => void;
}

function cleanPhone(phone: string): string {
  // Strip everything except digits and leading +
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

export default function WhatsAppModal({ phone, toName, onClose }: Props) {
  const [message, setMessage] = useState('');

  const cleanedPhone = cleanPhone(phone);
  const waUrl = `https://wa.me/${cleanedPhone}${message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ''}`;

  function openWhatsApp() {
    const w = 1100, h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      waUrl,
      '_blank',
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes,location=yes`,
    );
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
            <div className="flex items-center gap-2.5">
              {/* WhatsApp green icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.52 15.58 3.43 17.06L2 22L7.08 20.59C8.52 21.46 10.2 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#25D366"/>
                <path d="M17.47 14.77C17.22 14.65 16.02 14.06 15.79 13.97C15.56 13.88 15.39 13.84 15.22 14.09C15.05 14.34 14.59 14.89 14.44 15.06C14.29 15.24 14.13 15.26 13.88 15.14C13.63 15.02 12.83 14.76 11.88 13.91C11.14 13.25 10.65 12.43 10.5 12.18C10.35 11.93 10.48 11.79 10.6 11.67C10.71 11.56 10.85 11.38 10.97 11.23C11.09 11.08 11.13 10.97 11.22 10.8C11.31 10.63 11.27 10.48 11.21 10.36C11.15 10.24 10.66 9.04 10.45 8.55C10.25 8.07 10.04 8.13 9.88 8.12C9.73 8.12 9.56 8.12 9.39 8.12C9.22 8.12 8.95 8.18 8.72 8.43C8.49 8.68 7.85 9.27 7.85 10.47C7.85 11.67 8.74 12.82 8.86 12.99C8.98 13.17 10.64 15.7 13.15 16.75C14.62 17.38 15.21 17.43 15.96 17.32C16.42 17.25 17.37 16.72 17.58 16.13C17.79 15.54 17.79 15.04 17.73 14.93C17.67 14.82 17.5 14.77 17.27 14.65L17.47 14.77Z" fill="white"/>
              </svg>
              <div>
                <p className="text-sm font-semibold text-slate-100">WhatsApp</p>
                <p className="text-[10px] text-slate-500">{toName} · {phone}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-700/50">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-5 py-4">
            {/* Message */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Message <span className="normal-case text-slate-600">(optional — pre-fills in WhatsApp)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here…"
                rows={6}
                autoFocus
                className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-green-500/60 resize-none leading-relaxed"
              />
            </div>

            <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2.5 text-[10px] text-slate-500 flex items-start gap-2">
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-slate-600" />
              <span>
                WhatsApp Web will open with your message pre-typed. Just press <strong className="text-slate-400">Enter</strong> or click <strong className="text-slate-400">Send</strong> in WhatsApp to deliver it.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={openWhatsApp}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded font-semibold text-white transition-colors"
                style={{ backgroundColor: '#25D366' }}
              >
                <Send className="w-3.5 h-3.5" />
                Open in WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
