import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Area,
  ComposedChart
} from 'recharts';

export default function ProgressCharts({ latestLog, allLogs = [], athleteProfile = null, schedules = [] }) {
  // Mode toggle: 'volume' | 'kategori' | 'rpe_hr'
  const [activeChart, setActiveChart] = useState('kategori');
  // Kategori terpilih: 'easy_run' | 'interval' | 'tempo' | 'long_run'
  const [selectedCategory, setSelectedCategory] = useState('easy_run');

  // Target volume minggu 1 dihitung dari jadwal rencana latihan atau baseline atlet
  const baseTarget = schedules && schedules.length > 0
    ? schedules.reduce((acc, s) => acc + (Number(s.target_distance_km) || 0), 0)
    : (Number(athleteProfile?.baseline_weekly_km) || 16);
  const week1Target = Number(baseTarget.toFixed(1));

  // Volume riil minggu 1 dari log latihan nyata (0 km jika belum pernah mencatat latihan)
  const loggedKmTotal = allLogs.length > 0
    ? allLogs.reduce((acc, curr) => acc + (Number(curr.actual_distance_km) || 0), 0)
    : (latestLog?.actual_distance_km ? Number(latestLog.actual_distance_km) : 0);

  const activeWeekVolume = Number(loggedKmTotal.toFixed(1));
  const maxSafeVolume = Number((week1Target * 1.1).toFixed(1));
  const isOver10Percent = activeWeekVolume > maxSafeVolume;

  // 1. Data Tren Volume Mingguan
  const weeklyVolumeData = [
    {
      week: 'Mgg 1 (Aktif)',
      volume: activeWeekVolume,
      target: week1Target,
      maxSafe: maxSafeVolume
    },
    {
      week: 'Mgg 2',
      volume: 0,
      target: Number((week1Target * 1.08).toFixed(1)),
      maxSafe: Number((week1Target * 1.08 * 1.1).toFixed(1))
    },
    {
      week: 'Mgg 3',
      volume: 0,
      target: Number((week1Target * 1.15).toFixed(1)),
      maxSafe: Number((week1Target * 1.15 * 1.1).toFixed(1))
    },
    {
      week: 'Mgg 4 (Deload)',
      volume: 0,
      target: Number((week1Target * 0.85).toFixed(1)),
      maxSafe: Number((week1Target * 0.85 * 1.1).toFixed(1))
    },
    {
      week: 'Mgg 5 (Build)',
      volume: 0,
      target: Number((week1Target * 1.20).toFixed(1)),
      maxSafe: Number((week1Target * 1.20 * 1.1).toFixed(1))
    },
    {
      week: 'Mgg 6 (Build)',
      volume: 0,
      target: Number((week1Target * 1.28).toFixed(1)),
      maxSafe: Number((week1Target * 1.28 * 1.1).toFixed(1))
    }
  ];

  // 2. Data Korelasi RPE vs Detak Jantung
  const rpeHrCorrelationData = allLogs.length > 0
    ? allLogs.slice(0, 6).reverse().map((log, idx) => ({
        session: log.notes ? log.notes.slice(0, 10) : `Log #${idx + 1}`,
        rpe: Number(log.rpe_score) || 7,
        hr: Number(log.avg_hr) || 160,
        pace: log.formatted_pace || '6:00'
      }))
    : [
        {
          session: 'Target Easy',
          rpe: 3.5,
          hr: 135,
          pace: athleteProfile?.baseline_easy_pace ? athleteProfile.baseline_easy_pace.replace('/km', '') : '6:45'
        },
        {
          session: 'Target Long',
          rpe: 5.0,
          hr: 150,
          pace: athleteProfile?.baseline_easy_pace ? athleteProfile.baseline_easy_pace.replace('/km', '') : '6:45'
        },
        {
          session: 'Target Interval',
          rpe: 7.5,
          hr: 165,
          pace: athleteProfile?.goal_stage1_pace ? athleteProfile.goal_stage1_pace.split(' ')[0] : '5:55'
        }
      ];

  // --- LOGIKA KLASIFIKASI KATEGORI LARI (SPORT SCIENCE) ---
  const categorizeLog = (log) => {
    const type = log.schedule?.session_type?.toUpperCase() || '';
    const title = (log.schedule?.title || '').toLowerCase();
    const notes = (log.notes || '').toLowerCase();
    const dist = Number(log.actual_distance_km) || 0;

    if (type === 'INTERVAL' || title.includes('interval') || notes.includes('interval') || notes.includes('x800') || notes.includes('x400')) {
      return 'interval';
    }
    if (type === 'TEMPO' || title.includes('tempo') || notes.includes('tempo') || notes.includes('threshold')) {
      return 'tempo';
    }
    if (type === 'LONG_RUN' || title.includes('long') || notes.includes('long run') || dist >= 8.5) {
      return 'long_run';
    }
    if (type === 'EASY_RECOVERY' || title.includes('easy') || title.includes('recovery') || notes.includes('easy') || notes.includes('recovery')) {
      return 'easy_run';
    }
    return dist >= 8.5 ? 'long_run' : 'easy_run';
  };

  // Helper formatting pace detik/km ke mm:ss
  const formatPaceFromSec = (sec) => {
    if (!sec || isNaN(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Target Pace Dinamis berdasarkan Goal Atlet
  const targetMinutes = athleteProfile?.goal_stage1?.includes('Sub-25')
    ? 25
    : athleteProfile?.goal_stage1?.includes('Sub-20')
    ? 20
    : athleteProfile?.goal_stage1?.includes('Sub-30')
    ? 30
    : 30;

  const target5kPaceSec = (targetMinutes * 60) / 5; // e.g. 300s (5:00) for Sub-25, 360s (6:00) for Sub-30
  const easyTargetSec = Math.round(target5kPaceSec * 1.25); // ~6:15 for Sub-25, ~7:30 for Sub-30
  const intervalTargetSec = Math.round(target5kPaceSec * 0.96); // ~4:48 for Sub-25, ~5:45 for Sub-30
  const tempoTargetSec = Math.round(target5kPaceSec * 1.05); // ~5:15 for Sub-25, ~6:18 for Sub-30
  const longTargetSec = Math.round(target5kPaceSec * 1.30); // ~6:30 for Sub-25, ~7:48 for Sub-30

  const CATEGORY_META = {
    easy_run: {
      id: 'easy_run',
      label: 'Easy Run',
      emoji: '🟢',
      subtitle: 'Lari Pemulihan & Aerobik Zona 2',
      color: '#1b6d42',
      accentColor: '#34d399',
      desc: 'Membangun dasar aerobik dan efisiensi mitokondria. Ritme rileks, wajib lolos talk-test.',
      targetPaceFormatted: athleteProfile?.baseline_easy_pace ? athleteProfile.baseline_easy_pace.replace('/km', '') : formatPaceFromSec(easyTargetSec),
      targetHrDesc: '< 145 bpm (Zona 2)',
      idealRpe: '3 - 4 / 10'
    },
    interval: {
      id: 'interval',
      label: 'Interval',
      emoji: '⚡',
      subtitle: 'VO2Max & Kecepatan Ambang Keras',
      color: '#e11d48',
      accentColor: '#fb7185',
      desc: 'Melatih kapasitas paru, pelepasan laktat cepat, dan kecepatan spesifik menuju target 5K.',
      targetPaceFormatted: formatPaceFromSec(intervalTargetSec),
      targetHrDesc: '165 - 180+ bpm (Zona 4/5)',
      idealRpe: '7.5 - 9 / 10'
    },
    tempo: {
      id: 'tempo',
      label: 'Tempo',
      emoji: '⏱️',
      subtitle: 'Ambang Batas Laktat (Threshold)',
      color: '#d97706',
      accentColor: '#fbbf24',
      desc: 'Melatih tubuh menahan kecepatan tinggi dalam durasi stabil tanpa akumulasi asam berlebih.',
      targetPaceFormatted: formatPaceFromSec(tempoTargetSec),
      targetHrDesc: '155 - 168 bpm (Zona 3/4)',
      idealRpe: '6 - 7 / 10'
    },
    long_run: {
      id: 'long_run',
      label: 'Long Run',
      emoji: '🛣️',
      subtitle: 'Ketahanan Jarak Jauh (Time-on-Feet)',
      color: '#2563eb',
      accentColor: '#60a5fa',
      desc: 'Memperkuat biomekanik kaki, efisiensi glikogen, dan mental daya tahan berlari jauh.',
      targetPaceFormatted: formatPaceFromSec(longTargetSec),
      targetHrDesc: '< 155 bpm (Zona 2/3)',
      idealRpe: '4 - 5 / 10'
    }
  };

  // Filter logs per kategori
  const categorizedLogs = {
    easy_run: allLogs.filter(l => categorizeLog(l) === 'easy_run'),
    interval: allLogs.filter(l => categorizeLog(l) === 'interval'),
    tempo: allLogs.filter(l => categorizeLog(l) === 'tempo'),
    long_run: allLogs.filter(l => categorizeLog(l) === 'long_run')
  };

  const currentCategoryLogs = (categorizedLogs[selectedCategory] || []).slice().reverse();
  const currentCategoryMeta = CATEGORY_META[selectedCategory];

  // Agregat metrik kategori terpilih
  const catSessionCount = currentCategoryLogs.length;
  const catTotalDistance = currentCategoryLogs.reduce((acc, l) => acc + (Number(l.actual_distance_km) || 0), 0);
  const catAvgHr = catSessionCount > 0 
    ? Math.round(currentCategoryLogs.reduce((acc, l) => acc + (Number(l.avg_hr) || 0), 0) / catSessionCount)
    : null;
  const catAvgPaceSec = catSessionCount > 0
    ? Math.round(currentCategoryLogs.reduce((acc, l) => acc + (Number(l.avg_pace_sec_km) || 360), 0) / catSessionCount)
    : null;

  // Transformasi data untuk Recharts Kategori
  const categoryChartData = currentCategoryLogs.map((log, idx) => {
    const paceSec = Number(log.avg_pace_sec_km) || 360;
    const paceMin = Number((paceSec / 60).toFixed(2));
    const label = log.schedule?.day_name 
      ? `${log.schedule.day_name} (Sesi ${idx + 1})`
      : `Sesi ${idx + 1}`;
    return {
      session: label,
      paceMin,
      formattedPace: log.formatted_pace || formatPaceFromSec(paceSec),
      hr: Number(log.avg_hr) || 0,
      cadence: Number(log.cadence) || 0,
      distance: Number(log.actual_distance_km) || 0,
      rpe: Number(log.rpe_score) || 0,
      title: log.schedule?.title || 'Sesi Lari'
    };
  });

  // Tooltip Kustom untuk Grafik Kategori Lari
  const CustomCategoryTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-container-highest p-2.5 rounded-lg shadow-md border border-outline/20 text-[11px] font-body">
          <p className="font-bold text-on-surface mb-1">{label}</p>
          <p className="text-[10px] text-on-surface-variant font-medium mb-1.5">{data.title}</p>
          <div className="flex flex-col gap-1">
            <p className="text-primary font-semibold flex items-center justify-between gap-3">
              <span>Pace Rata-rata:</span>
              <strong className="text-on-surface">{data.formattedPace} /km</strong>
            </p>
            <p className="text-amber-700 font-semibold flex items-center justify-between gap-3">
              <span>Detak Jantung:</span>
              <strong className="text-on-surface">{data.hr} bpm</strong>
            </p>
            <p className="text-sky-700 font-semibold flex items-center justify-between gap-3">
              <span>Jarak:</span>
              <strong className="text-on-surface">{data.distance} km</strong>
            </p>
            {data.cadence > 0 && (
              <p className="text-purple-700 font-semibold flex items-center justify-between gap-3">
                <span>Kadens:</span>
                <strong className="text-on-surface">{data.cadence} spm</strong>
              </p>
            )}
            <p className="text-on-surface-variant text-[10px] pt-1 border-t border-outline/10">
              RPE Beban: <strong>{data.rpe} / 10</strong>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip untuk Volume
  const CustomVolumeTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-container-highest p-2.5 rounded-lg shadow-md border border-outline/20 text-[11px] font-body">
          <p className="font-bold text-on-surface mb-1">{label}</p>
          <p className="text-primary font-semibold">
            Realisasi: <strong className="text-on-surface">{payload[0].value} km</strong>
          </p>
          <p className="text-on-surface-variant">
            Batas Maks Aman (+10%): <strong>{payload[0].payload.maxSafe} km</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip untuk RPE vs HR
  const CustomRpeHrTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-container-highest p-2.5 rounded-lg shadow-md border border-outline/20 text-[11px] font-body">
          <p className="font-bold text-on-surface mb-1">{label} ({data.pace}/km)</p>
          <p className="text-primary font-semibold">
            RPE: <strong className="text-on-surface">{data.rpe} / 10</strong>
          </p>
          <p className="text-amber-700 font-semibold">
            Detak Jantung: <strong className="text-on-surface">{data.hr} bpm</strong>
          </p>
          <p className="text-[10px] text-on-surface-variant mt-1 italic">
            {data.rpe > 7 ? 'Intensitas Tinggi (Zona Anaerobik/Threshold)' : 'Intensitas Terkendali (Zona Aerobik)'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-space-sm animate-fade-in">
      {/* Header & Segmented Pill Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-primary">monitoring</span>
          <h3 className="font-headline text-[14px] font-bold text-on-surface">
            Analisis Visual Performa
          </h3>
        </div>

        {/* 3 Mode Switcher: Volume | Kategori Lari | RPE vs HR */}
        <div className="flex bg-surface-container p-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveChart('kategori')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
              activeChart === 'kategori'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant'
            }`}
          >
            <span>Kategori Lari</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChart('volume')}
            className={`px-2.5 py-1 rounded-full transition-all ${
              activeChart === 'volume'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant'
            }`}
          >
            Volume (km)
          </button>
          <button
            type="button"
            onClick={() => setActiveChart('rpe_hr')}
            className={`px-2.5 py-1 rounded-full transition-all ${
              activeChart === 'rpe_hr'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant'
            }`}
          >
            RPE vs HR
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: GRAFIK DATA BERBAGAI RUN PER KATEGORI (NEW)       */}
      {/* ======================================================== */}
      {activeChart === 'kategori' && (
        <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm border border-surface-container/60 flex flex-col gap-3">
          {/* Sub-Pills Kategori Lari */}
          <div className="grid grid-cols-4 gap-1 bg-surface-container-low p-1 rounded-lg">
            {Object.values(CATEGORY_META).map((cat) => {
              const count = (categorizedLogs[cat.id] || []).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`py-1.5 px-1 rounded-md text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-surface shadow-xs font-bold text-on-surface'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="text-[13px]">{cat.emoji}</span>
                  <span className="text-[10px] font-semibold leading-tight line-clamp-1">{cat.label}</span>
                  <span className={`text-[9px] px-1 rounded-full font-bold ${
                    count > 0 
                      ? 'bg-primary/15 text-primary' 
                      : 'bg-surface-container text-on-surface-variant/60'
                  }`}>
                    {count} sesi
                  </span>
                </button>
              );
            })}
          </div>

          {/* Banner Penjelasan & Ringkasan Metrik Kategori Terpilih */}
          <div className="flex flex-col gap-1.5 bg-surface-container-low/60 rounded-lg p-2.5 border border-surface-container/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px]">{currentCategoryMeta.emoji}</span>
                <span className="text-[12px] font-bold text-on-surface">
                  {currentCategoryMeta.label} — {currentCategoryMeta.subtitle}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-surface text-on-surface-variant border border-outline/10">
                Target: {currentCategoryMeta.targetPaceFormatted}/km
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {currentCategoryMeta.desc}
            </p>

            {/* Quick Metrics Bar Kategori */}
            {catSessionCount > 0 && (
              <div className="grid grid-cols-4 gap-1 pt-1.5 mt-1 border-t border-surface-container/60 text-center">
                <div className="flex flex-col">
                  <span className="text-[9px] text-on-surface-variant font-medium">Total Sesi</span>
                  <span className="text-[13px] font-bold text-on-surface">{catSessionCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-on-surface-variant font-medium">Pace Rata-rata</span>
                  <span className="text-[13px] font-bold text-primary">{formatPaceFromSec(catAvgPaceSec)}/km</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-on-surface-variant font-medium">Avg Detak Jantung</span>
                  <span className="text-[13px] font-bold text-amber-600">{catAvgHr} bpm</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-on-surface-variant font-medium">Jarak Akumulasi</span>
                  <span className="text-[13px] font-bold text-sky-700">{catTotalDistance.toFixed(1)} km</span>
                </div>
              </div>
            )}
          </div>

          {/* Tampilan Visual Grafik jika Ada Sesi */}
          {catSessionCount > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Evolusi Pace & Respon Kardio ({catSessionCount} sesi tercatat)</span>
                <span className="text-[10px] font-semibold text-primary">
                  Target: {currentCategoryMeta.targetPaceFormatted}/km
                </span>
              </div>

              <div className="w-full h-44 pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={categoryChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" opacity={0.6} />
                    <XAxis
                      dataKey="session"
                      tick={{ fontSize: 9, fill: '#6e7972' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cfd9d2' }}
                    />
                    {/* Sumbu Kiri: Pace (menit/km) */}
                    <YAxis
                      yAxisId="paceAxis"
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tick={{ fontSize: 10, fill: '#1b6d42' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        const m = Math.floor(val);
                        const s = Math.round((val - m) * 60);
                        return `${m}:${s.toString().padStart(2, '0')}`;
                      }}
                    />
                    {/* Sumbu Kanan: HR (bpm) */}
                    <YAxis
                      yAxisId="hrAxis"
                      orientation="right"
                      domain={[120, 185]}
                      tick={{ fontSize: 10, fill: '#d97706' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomCategoryTooltip />} />
                    
                    {/* Bar untuk Beban Detak Jantung */}
                    <Bar
                      yAxisId="hrAxis"
                      dataKey="hr"
                      fill="#d97706"
                      opacity={0.3}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                      name="Detak Jantung (bpm)"
                    />
                    {/* Garis Tren Pace */}
                    <Line
                      yAxisId="paceAxis"
                      type="monotone"
                      dataKey="paceMin"
                      stroke="#1b6d42"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#1b6d42' }}
                      activeDot={{ r: 7 }}
                      name="Pace Aktual (/km)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Indikator */}
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-surface-container/60">
                <span className="flex items-center gap-1 text-primary font-bold">
                  <span className="w-2.5 h-1 bg-primary inline-block"></span>
                  Garis Pace Aktual
                </span>
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 inline-block"></span>
                  Detak Jantung (bpm)
                </span>
              </div>
            </div>
          ) : (
            /* Tampilan Informatif ketika belum ada sesi untuk kategori ini */
            <div className="flex flex-col items-center justify-center p-4 bg-surface-container-low/40 rounded-lg text-center gap-2 border border-dashed border-outline/30">
              <span className="text-[24px]">{currentCategoryMeta.emoji}</span>
              <h4 className="text-[13px] font-bold text-on-surface">
                Belum Ada Catatan untuk {currentCategoryMeta.label}
              </h4>
              <p className="text-[11px] text-on-surface-variant max-w-[280px] leading-relaxed">
                Program AI akan menyertakan sesi {currentCategoryMeta.label} pada jadwal mingguanmu. Setelah kamu menyelesaikannya, grafik progres spesifik kategori ini akan otomatis tergambar di sini.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-1 rounded-full bg-surface text-[10px] font-bold text-primary border border-outline/20">
                  Target Pace: {currentCategoryMeta.targetPaceFormatted}/km
                </span>
                <span className="px-2.5 py-1 rounded-full bg-surface text-[10px] font-bold text-on-surface-variant border border-outline/20">
                  Zona HR: {currentCategoryMeta.targetHrDesc}
                </span>
              </div>
            </div>
          )}

          {/* Insight Sport Science Spesifik Kategori */}
          <div className="bg-surface-container-low rounded-lg p-2.5 text-[11px] text-on-surface-variant flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">school</span>
            <div className="leading-relaxed">
              <strong>Evaluasi Sport Science ({currentCategoryMeta.label}):</strong>{' '}
              {selectedCategory === 'easy_run' && (
                catSessionCount > 0
                  ? `Pace rata-ratamu (${formatPaceFromSec(catAvgPaceSec)}/km) dengan HR ${catAvgHr} bpm. Ingat prinsip 80/20: lari santai harus benar-benar mudah untuk mengoptimalkan perbaikan jaringan otot tanpa memicu kelelahan berlebih.`
                  : 'Easy run merupakan 70-80% dari total latihan mingguan pelari. Kunci suksesnya adalah menahan laju agar tidak masuk ke zona abu-abu (black hole training).'
              )}
              {selectedCategory === 'interval' && (
                catSessionCount > 0
                  ? `Sesi intervalmu berada di pace ${formatPaceFromSec(catAvgPaceSec)}/km. Konsistensi repetisi dan kecepatan pemulihan detak jantung pasca-interval adalah metrik kunci perkembangan VO2Max.`
                  : 'Sesi interval mengasah kemampuan sistem laktat dan kapasitas anaerobik untuk mempertahankan target kecepatan di lomba.'
              )}
              {selectedCategory === 'tempo' && (
                catSessionCount > 0
                  ? `Sesi tempo stabil di pace ${formatPaceFromSec(catAvgPaceSec)}/km. Tempo run menggeser ambang batas asam laktat agar tubuh bisa berlari kencang lebih lama.`
                  : 'Tempo run biasanya dilakukan pada batas nyaman-keras (comfortably hard) sekitar 20-30 menit tanpa henti.'
              )}
              {selectedCategory === 'long_run' && (
                catSessionCount > 0
                  ? `Long run terjauh: ${catTotalDistance.toFixed(1)} km. Pertahankan kadens stabil dan hidrasi teratur untuk membiasakan otot kaki menahan beban berulang.`
                  : 'Long run membangun efisiensi oksidasi lemak dan daya tahan struktural sendi serta ligamen kaki.'
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: TREN VOLUME MINGGUAN (RECHARTS BAR CHART)         */}
      {/* ======================================================== */}
      {activeChart === 'volume' && (
        <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm border border-surface-container/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant font-medium">
              Progres Jarak Lari Kumulatif
            </span>
            <span className={`px-2 py-0.5 rounded-full font-bold ${
              isOver10Percent ? 'bg-error/20 text-error' : 'bg-secondary-container/40 text-secondary'
            }`}>
              {isOver10Percent ? 'Peringatan: Melebihi +10%' : 'Kepatuhan Rule 10%: Optimal'}
            </span>
          </div>

          <div className="w-full h-44 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyVolumeData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" opacity={0.6} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: '#6e7972' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cfd9d2' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6e7972' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 24]}
                />
                <Tooltip content={<CustomVolumeTooltip />} />
                <ReferenceLine
                  y={19.8}
                  stroke="#ba1a1a"
                  strokeDasharray="4 4"
                  label={{ value: 'Batas +10%', fill: '#ba1a1a', fontSize: 9, position: 'insideTopRight' }}
                />
                <Bar
                  dataKey="volume"
                  fill="#1b6d42"
                  radius={[5, 5, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-surface-container/60">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block"></span>
              Volume Aktual (km)
            </span>
            <span className="flex items-center gap-1 text-error text-[10px] font-bold">
              - - - Plafon Batas Aman (SR-05)
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 3: KORELASI RPE vs DETAK JANTUNG (COMPOSED CHART)     */}
      {/* ======================================================== */}
      {activeChart === 'rpe_hr' && (
        <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm border border-surface-container/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant font-medium">
              Beban Subjektif (RPE) vs Respon Fisiologis (HR)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-bold">
              Kardio Adaptif
            </span>
          </div>

          <div className="w-full h-44 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={rpeHrCorrelationData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" opacity={0.6} />
                <XAxis
                  dataKey="session"
                  tick={{ fontSize: 9, fill: '#6e7972' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cfd9d2' }}
                />
                {/* Sumbu Y Kiri untuk RPE (Skala 1 - 10) */}
                <YAxis
                  yAxisId="left"
                  domain={[0, 10]}
                  tick={{ fontSize: 10, fill: '#1b6d42' }}
                  tickLine={false}
                  axisLine={false}
                />
                {/* Sumbu Y Kanan untuk HR (Skala 120 - 180 bpm) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[110, 180]}
                  tick={{ fontSize: 10, fill: '#d97706' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomRpeHrTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="rpe"
                  fill="#1b6d42"
                  opacity={0.35}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  name="RPE"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="hr"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#d97706' }}
                  activeDot={{ r: 6 }}
                  name="Detak Jantung (bpm)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-surface-container/60">
            <span className="flex items-center gap-1 text-primary font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary/40 inline-block"></span>
              RPE (Skala 1-10)
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-bold">
              <span className="w-2.5 h-1 bg-amber-600 inline-block"></span>
              Avg HR (bpm)
            </span>
          </div>
        </div>
      )}

      {/* Sport Science Footnote */}
      <div className="bg-surface-container-low rounded-lg p-2.5 text-[11px] text-on-surface-variant flex items-start gap-2">
        <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">insights</span>
        <p className="leading-relaxed">
          <strong>Insight Sport Science:</strong> Kategori latihan yang berbeda menargetkan adaptasi fisiologis yang berbeda. Easy Run membangun densitas mitokondria di Zona 2, Interval meningkatkan VO2Max, Tempo menggeser ambang batas laktat, dan Long Run melatih efisiensi neuromuskular.
        </p>
      </div>
    </div>
  );
}
