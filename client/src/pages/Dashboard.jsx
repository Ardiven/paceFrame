import React from 'react';
import ProgressCharts from '../components/ProgressCharts.jsx';

export default function Dashboard({ onNavigate, safetyState, athleteProfile = null, schedules = [], latestLog, allLogs = [], latestEvaluation }) {
  const runnerName = athleteProfile?.full_name ? athleteProfile.full_name.split(' ')[0] : 'Pelari';
  const targetGoal = athleteProfile?.goal_stage1 || schedules[0]?.plan?.target_milestone || '5K Sub-30';
  const activePhaseName = schedules[0]?.plan?.phase_name || 'Fase 1: Fondasi Aerobik & Adaptasi';
  const currentPhaseNum = schedules[0]?.plan?.phase_number || 1;

  const totalSessionsCount = schedules?.length || 4;
  const completedSessions = schedules?.filter(s => s.status === 'completed') || [];
  const completedSessionsCount = completedSessions.length;
  const targetVolume = Number((schedules?.reduce((sum, s) => sum + (Number(s.target_distance_km) || 0), 0) || Number(athleteProfile?.baseline_weekly_km) || 16).toFixed(1));
  const loggedKmTotal = allLogs.length > 0 
    ? allLogs.reduce((sum, l) => sum + (Number(l.actual_distance_km) || 0), 0)
    : (latestLog?.actual_distance_km ? Number(latestLog.actual_distance_km) : 0);
  const currentVolume = Number(loggedKmTotal.toFixed(1));
  const progressPercent = targetVolume > 0 ? Math.min(100, Math.round((currentVolume / targetVolume) * 100)) : 0;
  
  const remainingSessions = schedules?.filter(s => s.status !== 'completed') || [];
  const nextSession = remainingSessions[0] || schedules?.[0] || {
    title: 'Easy Recovery Run',
    target_distance_km: 4.0,
    target_pace: '6:30 - 6:45 /km',
    day_name: 'KAMIS',
    target_rpe: '3-4 / 10',
    badge: 'Disesuaikan Pelatih'
  };

  const hasLoggedWorkout = allLogs.length > 0 || Boolean(latestLog);

  // Kalkulasi Target & Baseline Dinamis
  const targetBadge = targetGoal.includes('Sub-') 
    ? targetGoal.match(/Sub-\d+/)?.[0] || 'Target' 
    : (targetGoal.includes('10K') ? '10K' : '5K');

  const baselinePbSec = athleteProfile?.pb_5k_sec || 1950;
  const baselinePbFormatted = `${Math.floor(baselinePbSec / 60)}:${(baselinePbSec % 60).toString().padStart(2, '0')}`;

  // Estimasi proyeksi 5K waktu terkini
  let projectedSec = baselinePbSec;
  if (allLogs.length > 0) {
    const validLogs = allLogs.filter(l => l.avg_pace_sec_km && l.avg_pace_sec_km > 0);
    if (validLogs.length > 0) {
      const minPace = Math.min(...validLogs.map(l => l.avg_pace_sec_km));
      projectedSec = Math.round(minPace * 5);
    }
  }
  const projectedTimeFormatted = `${Math.floor(projectedSec / 60)}:${(projectedSec % 60).toString().padStart(2, '0')}`;

  let targetSec = 1800;
  if (targetGoal.includes('Sub-25')) targetSec = 1500;
  else if (targetGoal.includes('Sub-20')) targetSec = 1200;
  else if (targetGoal.includes('Sub-30')) targetSec = 1800;
  else if (targetGoal.includes('Sub-60') || targetGoal.includes('10K')) targetSec = 3600;

  const totalGap = Math.max(60, baselinePbSec - targetSec);
  const currentImprovement = Math.max(0, baselinePbSec - projectedSec);
  const goalProgressPct = hasLoggedWorkout 
    ? Math.min(100, Math.max(20, Math.round((currentImprovement / totalGap) * 100)))
    : 15;
  const nextMilestoneName = targetBadge;

  const aiInsightText = hasLoggedWorkout
    ? (latestLog?.notes 
        ? `Sesi terakhirmu (${latestLog.actual_distance_km} km • Pace ${latestLog.formatted_pace || '6:00'}/km) tercatat solid. Jaga pemulihan dan kualitas tidur agar adaptasi mitokondria berlangsung optimal!` 
        : "Konsistensi lari awalmu sangat rapi. Pertahankan ritme rileks pada sesi recovery agar adaptasi sistem kardiorespirasi berlangsung optimal!")
    : `Halo ${runnerName}! AI Coach telah merancang program latihan khusus untuk membantumu mencapai target ${targetGoal}. Kita mulai dari Minggu 1 untuk membangun fondasi aerobik dan adaptasi biomekanik yang solid. Fokus pada konsistensi dan perhatikan sinyal tubuhmu!`;
  return (
    <div className="flex flex-col w-full px-margin-mobile pb-space-lg gap-space-lg">
      {/* 1. Hero Welcome Header */}
      <section className="flex flex-col gap-space-xs pt-space-sm">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-secondary-container/40 text-secondary mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
          <span className="font-headline text-[11px] uppercase tracking-wider font-bold">
            {activePhaseName}
          </span>
        </div>
        <h1 className="font-headline text-[26px] font-bold text-on-surface tracking-tight leading-tight">
          Selamat datang, {runnerName}! 👋
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          Setiap langkah konsisten membawamu semakin dekat ke target {targetGoal}.
        </p>

        {/* Quick Action CTA Buttons */}
        <div className="grid grid-cols-2 gap-space-sm mt-space-sm">
          <button
            onClick={() => onNavigate('log')}
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-on-primary font-headline text-[13px] font-semibold py-3 px-4 rounded-full shadow-md active:scale-95 transition-transform"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Catat Latihan</span>
          </button>
          <button
            onClick={() => onNavigate('coach')}
            className="w-full flex items-center justify-center gap-1.5 bg-surface-container-high text-on-surface font-headline text-[13px] font-semibold py-3 px-4 rounded-full shadow-sm active:scale-95 transition-transform"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">smart_toy</span>
            <span>Tanya AI Coach</span>
          </button>
        </div>
      </section>

      {/* 2. Metric Snapshot Carousel (Snap-scrollable) */}
      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-headline text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">
            Ringkasan Biometrik
          </span>
          <span className="text-[12px] text-primary flex items-center gap-0.5 font-medium">
            Geser <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </span>
        </div>

        <div className="flex gap-space-sm overflow-x-auto pb-2 -mx-margin-mobile px-margin-mobile no-scrollbar snap-x snap-mandatory">
          {/* Card 1: Target Utama */}
          <div className="snap-start shrink-0 w-[270px] bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col justify-between border border-surface-container/60">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
                  Target Utama
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-[11px] font-bold">
                  {targetBadge}
                </span>
              </div>
              <div className="font-headline text-[16px] text-on-surface font-bold">
                {targetGoal}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline text-[22px] text-primary font-extrabold">{projectedTimeFormatted}</span>
                <span className="text-[12px] text-on-surface-variant">
                  {hasLoggedWorkout ? 'Proyeksi saat ini' : 'Baseline awal'}
                </span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs">
              <div className="flex justify-between text-[11px] text-on-surface-variant mb-1 font-medium">
                <span>Baseline {baselinePbFormatted}</span>
                <span className="font-bold text-primary">{goalProgressPct}% ke {nextMilestoneName}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-container">
                <div className="h-1.5 rounded-full bg-primary transition-all duration-500" style={{ width: `${goalProgressPct}%` }}></div>
              </div>
            </div>
          </div>

          {/* Card 2: Minggu Ini */}
          <div className="snap-start shrink-0 w-[270px] bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col justify-between border border-surface-container/60">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
                  Minggu Ini
                </span>
                <span className="text-[11px] font-bold text-primary">{progressPercent}% Target</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-headline text-[28px] text-on-surface font-extrabold">{completedSessionsCount}</span>
                <span className="text-[15px] text-on-surface-variant font-semibold">/ {totalSessionsCount} Sesi</span>
              </div>
              <div className="text-[12px] text-on-surface-variant mt-0.5">
                Volume: <strong className="text-on-surface font-semibold">{currentVolume}</strong> dari {targetVolume} km
              </div>
            </div>
            <div className="mt-space-md pt-space-xs">
              <div className="w-full h-1.5 rounded-full bg-surface-container mb-2">
                <div className="h-1.5 rounded-full bg-secondary" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <span className="text-[11px] text-on-surface-variant">
                {remainingSessions.length > 0 
                  ? `Tersisa ${remainingSessions.length} sesi (${Math.max(0, Number((targetVolume - currentVolume).toFixed(1)))} km)` 
                  : 'Semua sesi minggu ini tuntas! 🎉'}
              </span>
            </div>
          </div>

          {/* Card 3: Safety Engine */}
          <div className="snap-start shrink-0 w-[270px] bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col justify-between border border-surface-container/60">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
                  Safety Engine
                </span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  <span className="text-[11px] font-bold uppercase">{safetyState?.state || 'NORMAL'}</span>
                </div>
              </div>
              <div className="font-headline text-[16px] text-on-surface font-bold">
                Ekuilibrium Optimal
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-headline text-[22px] text-primary font-extrabold">1.08</span>
                <span className="text-[12px] text-on-surface-variant">ACWR Ratio</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant text-[11px]">
              <span className="flex items-center gap-1 text-secondary font-bold">
                <span className="material-symbols-outlined text-[16px]">check_circle</span> Strain Rendah
              </span>
              <span>Risiko Cedera &lt; 5%</span>
            </div>
          </div>

          {/* Card 4: Sesi Hari Ini */}
          <div className="snap-start shrink-0 w-[270px] bg-surface-container-high rounded-lg p-space-md shadow-sm flex flex-col justify-between border border-surface-container">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="text-[11px] text-primary font-bold uppercase tracking-wider">
                  Sesi Berikutnya
                </span>
                <span className="text-[10px] bg-primary text-on-primary px-2 py-0.5 rounded-full font-bold">
                  {nextSession.day_name} • SIAP
                </span>
              </div>
              <div className="font-headline text-[16px] text-on-surface font-bold">
                {nextSession.title}
              </div>
              <div className="flex items-center gap-2 mt-1 text-on-surface-variant text-[12px]">
                <span>{nextSession.target_distance_km} km</span>
                <span>•</span>
                <span>Pace {nextSession.target_pace}</span>
                {nextSession.badge && (
                  <span className="px-1.5 py-0.2 bg-secondary-container/60 text-secondary text-[10px] font-bold rounded">
                    {nextSession.badge}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between text-[11px]">
              <span className="text-on-surface-variant">
                Target RPE: <strong className="text-on-surface font-bold">{nextSession.target_rpe || '4 / 10'}</strong>
              </span>
              <button
                onClick={() => onNavigate('log', nextSession)}
                className="text-primary font-bold flex items-center gap-0.5 hover:underline"
              >
                Catat <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI Coach Insight Preview Card */}
      <section className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container/60 relative overflow-hidden">
        <div className="flex items-center gap-space-xs">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">psychology</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-headline text-[15px] font-bold text-on-surface leading-tight">
              Insight AI Coach
            </h3>
            <span className="text-[11px] text-on-surface-variant">
              {hasLoggedWorkout ? 'Dianalisis dari log sesi terakhir' : 'Arahan Minggu 1 Adaptif'}
            </span>
          </div>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-[11px] font-bold">
            {hasLoggedWorkout ? 'Terkalibrasi' : 'Program Aktif'}
          </span>
        </div>

        <div className="bg-surface-container-low rounded-DEFAULT p-space-sm">
          <p className="text-[13px] text-on-surface italic leading-relaxed">
            "{aiInsightText}"
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[16px] text-primary">eco</span>
            Fondasi aerobik &amp; biomekanik
          </span>
          <button
            onClick={() => onNavigate('coach')}
            className="text-[12px] text-primary font-bold flex items-center gap-0.5 hover:underline"
            type="button"
          >
            Diskusi Sesi <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </section>

      {/* 4. Roadmap Periodisasi (Dinamis Sesuai Fase Aktif) */}
      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-[16px] font-bold text-on-surface">
              Roadmap Periodisasi
            </h2>
            <p className="text-[11px] text-on-surface-variant">Siklus 12 Minggu Menuju Race Day</p>
          </div>
          <span className="text-[12px] text-primary font-bold">Mgg 1 / 12</span>
        </div>

        <div className="flex gap-space-xs overflow-x-auto pb-2 -mx-margin-mobile px-margin-mobile no-scrollbar">
          {/* Phase 1: Fondasi (Aktif di Awal) */}
          <div className={`shrink-0 ${currentPhaseNum === 1 ? 'w-48 bg-primary text-on-primary shadow-md' : 'w-36 bg-surface-container border border-surface-container-high'} rounded-DEFAULT p-space-sm flex flex-col gap-1`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${currentPhaseNum === 1 ? 'text-primary-fixed' : 'text-on-surface-variant'}`}>
                {currentPhaseNum === 1 ? 'Aktif Sekarang' : 'Fase 1'}
              </span>
              <span className={`material-symbols-outlined text-[18px] ${currentPhaseNum === 1 ? 'text-primary-fixed' : 'text-secondary'}`}>
                {currentPhaseNum === 1 ? 'bolt' : 'check_circle'}
              </span>
            </div>
            <span className={`font-headline text-[14px] font-extrabold leading-snug ${currentPhaseNum === 1 ? 'text-on-primary' : 'text-on-surface'}`}>
              Fase 1: Fondasi
            </span>
            <span className={`text-[11px] ${currentPhaseNum === 1 ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>
              {currentPhaseNum === 1 ? 'Minggu 1 dari 12' : 'Selesai (Mgg 1-4)'}
            </span>
          </div>

          {/* Phase 2: Speed Build */}
          <div className="shrink-0 w-36 bg-surface-container-low rounded-DEFAULT p-space-sm flex flex-col gap-1 border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant font-bold">Fase 2</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">lock_clock</span>
            </div>
            <span className="font-headline text-[13px] text-on-surface font-bold leading-snug">
              Speed Build
            </span>
            <span className="text-[10px] text-on-surface-variant">Mgg 5-8</span>
          </div>

          {/* Phase 3: Race Specific */}
          <div className="shrink-0 w-36 bg-surface-container-low rounded-DEFAULT p-space-sm flex flex-col gap-1 border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant font-bold">Fase 3</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">lock_clock</span>
            </div>
            <span className="font-headline text-[13px] text-on-surface font-bold leading-snug">
              Spesifik Race Pace
            </span>
            <span className="text-[10px] text-on-surface-variant">Mgg 9-11</span>
          </div>

          {/* Phase 4: Taper & Race Day */}
          <div className="shrink-0 w-36 bg-surface-container-low rounded-DEFAULT p-space-sm flex flex-col gap-1 border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant font-bold">Fase 4</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">flag</span>
            </div>
            <span className="font-headline text-[13px] text-on-surface font-bold leading-snug">
              Taper &amp; Race Day
            </span>
            <span className="text-[10px] text-on-surface-variant">Mgg 12</span>
          </div>
        </div>
      </section>

      {/* 4.5. Grafik Visual Interaktif (Recharts) */}
      <section>
        <ProgressCharts
          latestLog={latestLog}
          allLogs={allLogs}
          athleteProfile={athleteProfile}
          schedules={schedules}
        />
      </section>

      {/* 5. Jadwal Sesi Minggu Ini */}
      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-[16px] font-bold text-on-surface">
            Jadwal Sesi Minggu Ini
          </h2>
          <button onClick={() => onNavigate('plan')} className="text-[12px] text-primary font-bold">
            Lihat Semua
          </button>
        </div>

        <div className="flex flex-col gap-space-sm">
          {schedules && schedules.length > 0 ? (
            schedules.map((session) => (
              <div
                key={session.id}
                className={`rounded-lg p-space-md shadow-sm flex items-center justify-between border ${
                  session.badge ? 'bg-secondary-container/10 border-secondary/40' : 'bg-surface-container-lowest border-surface-container/60'
                }`}
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    session.status === 'completed'
                      ? 'bg-secondary-container/40 text-secondary'
                      : session.badge
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {session.status === 'completed' ? 'check' : session.session_type === 'STRENGTH_MOBILITY' ? 'fitness_center' : 'directions_run'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                        {session.day_name}
                      </span>
                      {session.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-bold">
                          {session.badge}
                        </span>
                      )}
                    </div>
                    <div className="font-headline text-[14px] text-on-surface font-bold truncate">
                      {session.title}
                    </div>
                    <div className="text-[12px] text-on-surface-variant">
                      {session.target_distance_km > 0 ? `${session.target_distance_km} km • Pace ${session.target_pace}` : session.instructions || 'Sesi Mobilitas'}
                    </div>
                  </div>
                </div>
                {session.status === 'completed' ? (
                  <span className="px-3 py-1 rounded-full bg-secondary-container/40 text-secondary text-[11px] font-bold flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    Selesai
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigate('log', session)}
                    className="px-3.5 py-1.5 rounded-full bg-surface-container active:bg-primary active:text-on-primary text-on-surface text-[11px] font-bold shrink-0 transition-colors"
                    type="button"
                  >
                    Catat
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-on-surface-variant text-[13px]">
              Memuat jadwal sesi dari cloud...
            </div>
          )}
        </div>
      </section>

      {/* 6. Log Latihan Terverifikasi */}
      <section className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">verified</span>
            <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Log Terverifikasi
            </span>
          </div>
          <span className="text-[11px] text-secondary font-bold">Tersinkronisasi GPS</span>
        </div>

        <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
          <div className="flex flex-col bg-surface-container-low rounded-DEFAULT p-2 text-center">
            <span className="text-[11px] text-on-surface-variant">Jarak</span>
            <span className="font-headline text-[18px] text-on-surface font-bold">
              {latestLog?.actual_distance_km ? Number(latestLog.actual_distance_km).toFixed(2) : '6.52'}
            </span>
            <span className="text-[10px] text-on-surface-variant">km</span>
          </div>
          <div className="flex flex-col bg-surface-container-low rounded-DEFAULT p-2 text-center">
            <span className="text-[11px] text-on-surface-variant">Pace Avg</span>
            <span className="font-headline text-[18px] text-primary font-bold">
              {latestLog?.formatted_pace || '5:48'}
            </span>
            <span className="text-[10px] text-on-surface-variant">/km</span>
          </div>
          <div className="flex flex-col bg-surface-container-low rounded-DEFAULT p-2 text-center">
            <span className="text-[11px] text-on-surface-variant">Avg HR</span>
            <span className="font-headline text-[18px] text-on-surface font-bold">
              {latestLog?.avg_hr ?? 162}
            </span>
            <span className="text-[10px] text-on-surface-variant">bpm</span>
          </div>
        </div>

        {/* Zona Split representation */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-[11px] text-on-surface-variant">
            <span>Stabilitas Zona 4 (Threshold)</span>
            <span className="font-bold text-on-surface">82% Dalam Target</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
            <div className="h-full bg-secondary-container" style={{ width: '12%' }}></div>
            <div className="h-full bg-primary" style={{ width: '82%' }}></div>
            <div className="h-full bg-error-container" style={{ width: '6%' }}></div>
          </div>
          <div className="flex justify-between text-[10px] text-on-surface-variant">
            <span>Pemanasan (12%)</span>
            <span className="text-primary font-bold">Optimal Threshold (82%)</span>
            <span>Spike (6%)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
