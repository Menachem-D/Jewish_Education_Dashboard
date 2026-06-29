'use client';

interface SocialIconButtonProps {
  icon: React.ReactNode;
  label: string;
  url: string | null;
  color: string;
}

export default function SocialIconButton({ icon, label, url, color }: SocialIconButtonProps) {
  function handleClick() {
    if (!url) return;
    const w = 1100, h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes,location=yes`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={!url}
      title={label}
      className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border transition-all ${
        url
          ? 'border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/60 hover:border-slate-600 cursor-pointer'
          : 'border-slate-800/60 bg-slate-900/20 opacity-30 cursor-default'
      }`}
    >
      <span style={{ color }} className="flex items-center justify-center w-5 h-5">
        {icon}
      </span>
      <span className="text-[9px] text-slate-500 font-medium leading-none">{label}</span>
    </button>
  );
}
