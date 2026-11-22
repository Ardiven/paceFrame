import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api.js';

export default function SchedulePage({ schedules: propSchedules, onRefresh, onLogSession, session }) {
  const [schedules, setSchedules] = useState(propSchedules || []);
  const [activePhase, setActivePhase] = useState('Fase 2: Build Kecepatan');
  const [isLoading, setIsLoading] = useState(!propSchedules || propSchedules.length === 0);

  useEffect(() => {
    if (propSchedules && propSchedules.length > 0) {
      setSchedules(propSchedules);
      setIsLoading(false);
      return;
    }
    apiFetch('/api/schedules', {}, session)
      .then(res => res.json())
      .then(data => {
        if (data.schedules) {
          setSchedules(data.schedules);
          setActivePhase(data.activePhase || activePhase);
        }
      })
      .catch(err => console.error('Error fetching schedules:', err))
      .finally(() => setIsLoading(false));
  }, [propSchedules]);

  return (
    <div className="flex flex-col w-full px-margin-mobile pb-28 gap-space-md animate-fade-in">
      {/* Header Info */}
      <div className="pt-space-xs flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          <span className="font-headline text-[10px] uppercase font-bold tracking-wider">
            {activePhase}
          </span>
        </div>
        <h2 className="font-headline text-[22px] font-bold text-on-surface">
          Rencana Latihan (Rolling Plan)
        </h2>
        <p className="text-[13px] text-on-surface-variant">
          Kartu sesi terstruktur untuk minggu aktif. Penyesuaian divalidasi Safety Engine.
        </p>
      </div>

      {/* Week Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['Mgg 1 (Aktif)', 'Mgg 2', 'Mgg 3', 'Mgg 4', 'Mgg 5', 'Mgg 6'].map((w, idx) => (
          <button
            key={w}
            type="button"
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all ${
              idx === 0
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* List of Scheduled Workouts */}
      <div className="flex flex-col gap-space-sm">
        {isLoading ? (
          <div className="p-8 text-center text-outline text-[13px]">Memuat jadwal latihan...</div>
        ) : (
          schedules.map((item) => {
            const isCompleted = item.status === 'completed';
            const isInterval = item.session_type === 'INTERVAL';
            const isLongRun = item.session_type === 'LONG_RUN';

            return (
              <div
                key={item.id}
                className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-2.5 border border-surface-container/60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-secondary-container text-secondary'
                          : isInterval
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        {isCompleted ? 'check' : isInterval ? 'bolt' : isLongRun ? 'route' : 'directions_run'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                          {item.day_name}
                        </span>
                        {item.badge && (
                          <span className="px-2 py-0.2 rounded-full bg-secondary-container/40 text-secondary text-[10px] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-headline text-[15px] font-bold text-on-surface">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {item.target_distance_km > 0 && (
                    <div className="text-right">
                      <span className="font-headline text-[15px] font-extrabold text-primary">
                        {item.target_distance_km}
                      </span>
                      <span className="text-[11px] text-outline ml-0.5">km</span>
                    </div>
                  )}
                </div>

                <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col gap-1 text-[12px]">
                  <div className="flex items-center justify-between text-on-surface">
                    <span>Target Pace: <strong className="font-bold">{item.target_pace}</strong></span>
                    <span>Target RPE: <strong className="font-bold">{item.target_rpe}</strong></span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    {item.instructions}
                  </p>
                  {item.strength_addon && (
                    <div className="pt-1 mt-1 border-t border-surface-container text-[11px] text-secondary font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">fitness_center</span>
                      <span>Strength: {item.strength_addon}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[11px] font-medium ${isCompleted ? 'text-secondary font-bold' : 'text-outline'}`}>
                    Status: {isCompleted ? '✓ Selesai Dicatat' : item.status}
                  </span>
                  {isCompleted ? (
                    <button
                      onClick={() => onLogSession(item)}
                      className="px-3 py-1 rounded-full bg-secondary-container/30 text-secondary text-[11px] font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      <span>Catat Ulang</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onLogSession(item)}
                      className="px-3 py-1 rounded-full bg-surface-container text-primary hover:bg-primary hover:text-on-primary text-[11px] font-bold transition-colors flex items-center gap-1"
                    >
                      <span>Catat Sesi</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
