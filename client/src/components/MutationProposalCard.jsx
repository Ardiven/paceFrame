import React from 'react';

export default function MutationProposalCard({ proposal, onApprove, onReject, onUndo }) {
  if (!proposal) return null;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-secondary/30 flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary-container text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
              Usulan Penyesuaian Jadwal (Assisted)
            </span>
            <h4 className="font-headline text-[14px] font-bold text-on-surface">
              {proposal.title || 'Penyesuaian Beban Adaptif'}
            </h4>
          </div>
        </div>
        <span className="text-[10px] bg-secondary-container/50 text-secondary px-2 py-0.5 rounded-full font-bold">
          {proposal.ruleId || 'SR-02'}
        </span>
      </div>

      <p className="text-[12px] text-on-surface-variant leading-relaxed">
        {proposal.reason || 'Sistem mengusulkan penurunan intensitas untuk melindungi jaringan ikat.'}
      </p>

      {/* Before vs After Diff Table */}
      <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-2.5 rounded-lg text-[11px]">
        <div className="flex flex-col gap-1 border-r border-surface-container pr-2">
          <span className="text-[10px] font-bold text-outline uppercase">Sebelum</span>
          <div className="text-on-surface">
            <p className="font-bold">{proposal.before?.session_type || 'Interval 5x800m'}</p>
            <p className="text-on-surface-variant">{proposal.before?.distance || '6.5 km • Pace 5:48'}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 pl-1">
          <span className="text-[10px] font-bold text-secondary uppercase">Disesuaikan Menjadi</span>
          <div className="text-on-surface">
            <p className="font-bold text-primary">{proposal.after?.session_type || 'Easy Run (Recovery)'}</p>
            <p className="text-secondary font-semibold">{proposal.after?.distance || '4.5 km • Pace 6:30'}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onApprove(proposal.id)}
          className="flex-1 py-2 px-3 rounded-full bg-primary text-on-primary text-[12px] font-bold shadow-xs active:scale-95 transition-transform flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">check</span>
          <span>Setuju &amp; Terapkan</span>
        </button>
        <button
          type="button"
          onClick={() => onReject(proposal.id)}
          className="py-2 px-3 rounded-full bg-surface-container text-on-surface-variant text-[12px] font-semibold hover:bg-surface-container-high transition-colors"
        >
          Tolak
        </button>
        {onUndo && (
          <button
            type="button"
            onClick={() => onUndo(proposal.id)}
            className="py-2 px-2.5 rounded-full bg-surface-container text-on-surface-variant text-[12px] hover:text-on-surface flex items-center justify-center"
            title="Undo / Batalkan"
          >
            <span className="material-symbols-outlined text-[16px]">undo</span>
          </button>
        )}
      </div>
    </div>
  );
}
