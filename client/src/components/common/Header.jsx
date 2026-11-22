import React from 'react';

export default function Header({ safetyState = { state: 'NORMAL' }, onOpenProfile }) {
  const getBadgeStyle = () => {
    switch (safetyState.state) {
      case 'MEDICAL_HOLD':
        return 'bg-error-container text-error border border-error/30';
      case 'LOCKED':
        return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'CAUTION':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'NORMAL':
      default:
        return 'bg-secondary-container/30 text-secondary';
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-on-primary text-[19px]">sprint</span>
            </div>
            <span className="font-headline font-bold text-headline-sm text-on-surface tracking-tight truncate">
              PaceFrame
            </span>
          </div>

          {/* Safety Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shrink-0 ${getBadgeStyle()}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${safetyState.state === 'MEDICAL_HOLD' ? 'bg-error' : 'bg-secondary'} animate-pulse`}></span>
            <span className="font-headline text-[11px] font-bold uppercase tracking-wider">
              {safetyState.state}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-xs shrink-0">
          <button
            aria-label="Notifikasi"
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
          </button>
          <button
            onClick={onOpenProfile}
            aria-label="Profil"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
}
