'use client';

import { SquareArrowOutUpRight } from 'lucide-react';

interface PopupButtonProps {
  label: string;
  sublabel: string;
  url: string;
  color: string;
}

export default function PopupButton({ label, sublabel, url, color }: PopupButtonProps) {
  function openPopup() {
    const w = 1100;
    const h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      url,
      '_blank',
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes,location=yes`,
    );
  }

  return (
    <button
      onClick={openPopup}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/60 hover:border-slate-600 transition-all group text-left"
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-200 group-hover:text-white leading-tight">
          {label}
        </div>
        <div className="text-[10px] text-slate-600 truncate leading-tight mt-0.5">{sublabel}</div>
      </div>
      <SquareArrowOutUpRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
    </button>
  );
}
