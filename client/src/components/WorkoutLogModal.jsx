import React, { useState, useRef } from 'react';
import { apiFetch } from '../services/api.js';

export default function WorkoutLogModal({ onSaveSuccess, onCancel, session, selectedSchedule = null, schedules = [] }) {
  // Target schedule mapping
  const initialSchedule = selectedSchedule || schedules.find(s => s.status !== 'completed') || schedules[0];
  const [selectedScheduleId, setSelectedScheduleId] = useState(initialSchedule?.id || '');

  // Mode: 'ocr' | 'manual'
  const [entryMode, setEntryMode] = useState('ocr');

  // Objective Telemetry
  const [distanceKm, setDistanceKm] = useState(initialSchedule?.target_distance_km ? Number(initialSchedule.target_distance_km) : 6.52);
  const [durationMin, setDurationMin] = useState(37);
  const [durationSec, setDurationSec] = useState(48);
  const [cadence, setCadence] = useState(172);
  const [avgHr, setAvgHr] = useState(162);

  // Sync when selectedSchedule changes
  React.useEffect(() => {
    if (selectedSchedule) {
      setSelectedScheduleId(selectedSchedule.id);
      if (selectedSchedule.target_distance_km) {
        setDistanceKm(Number(selectedSchedule.target_distance_km));
      }
    }
  }, [selectedSchedule]);

  // Vision OCR states
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [detectedApp, setDetectedApp] = useState(null);
  const [ocrError, setOcrError] = useState(null);
  const [discrepancyWarning, setDiscrepancyWarning] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState(null);

  // Subjective Bio-Feedback (PRD Bagian 2.2)
  const [rpeScore, setRpeScore] = useState(7.5);
  const [muscleSoreness, setMuscleSoreness] = useState(3);
  const [fatigueScore, setFatigueScore] = useState(4);
  const [sleepHours, setSleepHours] = useState(7.5);

  // Pain / Injury Variables (SR-01 & SR-02)
  const [selectedLocations, setSelectedLocations] = useState(['Betis Kanan (Gastrocnemius)']);
  const [sharpPain, setSharpPain] = useState(false); // Red flag if true
  const [functionalLimitation, setFunctionalLimitation] = useState(false); // Red flag if true
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableLocations = [
    'Betis Kanan (Gastrocnemius)',
    'Tendon Achilles',
    'Lutut (Patella)',
    'Hamstring',
    'Telapak Kaki (Plantar)'
  ];

  const toggleLocation = (loc) => {
    if (selectedLocations.includes(loc)) {
      setSelectedLocations(selectedLocations.filter(l => l !== loc));
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsAnalyzingImage(true);
    setOcrError(null);
    setDiscrepancyWarning(null);

    try {
      const formData = new FormData();
      formData.append('screenshot', file);

      const res = await apiFetch('/api/coach/log-workout/extract', {
        method: 'POST',
        body: formData
      }, session);

      if (!res.ok) {
        throw new Error('Gagal menganalisis gambar screenshot');
      }

      const data = await res.json();
      if (data.status === 'success') {
        const ext = data.extracted || {};
        if (ext.distanceKm !== undefined && ext.distanceKm !== null) {
          setDistanceKm(ext.distanceKm);
        }
        if (ext.durationSec) {
          setDurationMin(Math.floor(ext.durationSec / 60));
          setDurationSec(ext.durationSec % 60);
        }
        if (ext.avgHr) {
          setAvgHr(ext.avgHr);
        }
        if (ext.cadence) {
          setCadence(ext.cadence);
        }
        if (ext.appSource) {
          setDetectedApp(ext.appSource);
        }
        if (data.warning) {
          setDiscrepancyWarning(data.warning);
        }
        if (data.imageUrl) {
          setScreenshotUrl(data.imageUrl);
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrError(err.message || 'Gagal membaca gambar. Silakan gunakan mode input manual.');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Calculate live pace
  const totalSeconds = (Number(durationMin) * 60) + Number(durationSec);
  const computedSecPerKm = distanceKm > 0 ? Math.round(totalSeconds / distanceKm) : 0;
  const paceMinutes = Math.floor(computedSecPerKm / 60);
  const paceSecs = (computedSecPerKm % 60).toString().padStart(2, '0');
  const formattedPace = `${paceMinutes}:${paceSecs}`;

  // Live Safety Engine preview
  const isRedFlag = sharpPain || functionalLimitation;
  const isLocked = !isRedFlag && selectedLocations.length > 0 && muscleSoreness >= 4;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        scheduleId: selectedScheduleId || undefined,
        distanceKm,
        durationSec: totalSeconds,
        cadence,
        avgHr,
        rpeScore,
        muscleSoreness,
        localizedPain: selectedLocations.length > 0 ? muscleSoreness : 0,
        painLocation: selectedLocations.join(', '),
        sharpPain,
        functionalLimitation,
        fatigueScore,
        sleepHours,
        notes,
        screenshotUrl
      };

      const response = await apiFetch('/api/coach/log-workout', {
        method: 'POST',
        headers: {
          'Idempotency-Key': `log-${Date.now()}`
        },
        body: JSON.stringify(payload)
      }, session);

      const data = await response.json();
      if (data.status === 'success') {
        onSaveSuccess(data);
      }
    } catch (err) {
      console.error('Error saving workout log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-36 animate-fade-in">
      {/* 1. Header Section */}
      <section className="px-margin-mobile pt-space-xs pb-space-sm flex flex-col gap-space-xs">
        <div className="flex items-center gap-space-xs">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container">
            <span className="material-symbols-outlined text-[15px]">fitness_center</span>
          </span>
          <span className="font-headline text-[11px] uppercase tracking-wider text-secondary font-bold">
            Telemetry Sync • Multimodal
          </span>
        </div>
        <h2 className="font-headline text-[22px] font-bold text-on-surface">
          Catat Sesi Latihan
        </h2>
        <p className="text-[13px] text-on-surface-variant">
          Rekam data performa objektif &amp; bio-feedback subjektif sesuai PRD v1.2.
        </p>

        {/* Schedule Selector */}
        {schedules && schedules.length > 0 && (
          <div className="mt-2 bg-surface-container-lowest rounded-xl p-3 border border-surface-container/60 flex flex-col gap-1.5 shadow-sm">
            <label className="text-[10px] text-outline uppercase font-bold tracking-wider">
              Tautkan ke Jadwal Rencana Latihan:
            </label>
            <select
              value={selectedScheduleId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedScheduleId(newId);
                const sch = schedules.find(s => s.id === newId);
                if (sch?.target_distance_km) {
                  setDistanceKm(Number(sch.target_distance_km));
                }
              }}
              className="w-full bg-surface-container text-on-surface rounded-lg px-3 py-2 text-[12.5px] font-medium border border-surface-container focus:outline-none focus:border-primary"
            >
              <option value="">-- Latihan Bebas / Di Luar Jadwal --</option>
              {schedules.map(sch => (
                <option key={sch.id} value={sch.id}>
                  {sch.day_name}: {sch.title} ({sch.target_distance_km} km) {sch.status === 'completed' ? '✓ Selesai' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* 2. Method Segmented Control */}
      <section className="px-margin-mobile py-space-xs">
        <div className="bg-surface-container p-1 rounded-full flex items-center shadow-sm">
          <button
            onClick={() => setEntryMode('ocr')}
            className={`flex-1 py-2 px-space-sm rounded-full flex items-center justify-center gap-1.5 font-headline text-[12px] font-semibold transition-all ${
              entryMode === 'ocr'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">document_scanner</span>
            <span className="truncate">Tangkapan Layar (Smart OCR)</span>
          </button>
          <button
            onClick={() => setEntryMode('manual')}
            className={`flex-1 py-2 px-space-sm rounded-full flex items-center justify-center gap-1.5 font-headline text-[12px] font-semibold transition-all ${
              entryMode === 'manual'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span className="truncate">Entri Manual</span>
          </button>
        </div>
      </section>

      {/* 3. OCR Screen Upload Card */}
      {entryMode === 'ocr' && (
        <section className="px-margin-mobile py-space-sm">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageFileChange}
          />

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/40 cursor-pointer active:scale-[0.99] transition-transform hover:border-primary"
            >
              <div className="w-12 h-12 rounded-full bg-secondary-container/40 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">add_a_photo</span>
              </div>
              <div className="text-center">
                <p className="font-headline text-[14px] text-on-surface font-bold">
                  Unggah Screenshot Sesi Lari
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Garmin, Strava, Apple Fitness, Nike Run Club, Coros
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-primary text-on-primary text-[11px] font-bold shadow-sm"
              >
                Pilih File / Ambil Foto
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex p-1.5 rounded-full bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </span>
                  <div>
                    <p className="font-headline text-[13px] text-on-surface font-bold">
                      {isAnalyzingImage ? 'Sedang Memindai Gambar...' : 'Tangkapan Layar Terdeteksi: Valid'}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {detectedApp || selectedFile.name} • {(selectedFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] bg-surface-container text-primary px-2.5 py-1 rounded-full font-bold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[13px]">cached</span> Ganti
                </button>
              </div>

              {isAnalyzingImage ? (
                <div className="flex items-center gap-3 bg-secondary-container/20 p-3 rounded-lg border border-secondary/30 animate-pulse">
                  <span className="material-symbols-outlined text-primary text-[24px] animate-spin">progress_activity</span>
                  <div className="text-[12px] text-on-surface font-medium">
                    Gemini Vision AI sedang mengekstrak jarak, durasi, pace, dan detak jantung...
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-space-sm bg-surface-container-low p-space-sm rounded-DEFAULT">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Screenshot"
                      className="w-12 h-12 rounded-DEFAULT object-cover border border-outline/20 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-DEFAULT bg-primary/15 flex items-center justify-center shrink-0 text-primary">
                      <span className="material-symbols-outlined text-[24px]">watch</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-headline text-[13px] text-on-surface font-semibold truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-secondary font-bold">
                      Ekstraksi Gemini Vision Berhasil (Otomatis Terisi)
                    </p>
                  </div>
                </div>
              )}

              {discrepancyWarning && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-amber-800">
                  <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">warning</span>
                  <p className="text-[11px] leading-tight font-medium">
                    {discrepancyWarning}
                  </p>
                </div>
              )}

              {ocrError && (
                <div className="flex items-start gap-2 bg-error/10 border border-error/30 rounded-lg p-2.5 text-error">
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
                  <p className="text-[11px] leading-tight font-medium">{ocrError}</p>
                </div>
              )}

              <div className="flex items-start gap-space-xs bg-surface-container-low rounded-DEFAULT p-space-xs px-space-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">info</span>
                <p className="text-[11px] leading-tight text-on-surface-variant">
                  Data di bawah terisi otomatis dari foto dan tetap dapat diedit sebelum disimpan.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. Objective Metrics Grid (2-Column Mobile) */}
      <section className="px-margin-mobile py-space-xs">
        <div className="flex items-center justify-between pb-space-xs">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
            <h3 className="font-headline text-[15px] font-bold text-on-surface">
              Data Telemetri Objektif
            </h3>
          </div>
          <span className="text-[11px] text-outline">Ketuk untuk Mengedit</span>
        </div>

        <div className="grid grid-cols-2 gap-space-sm">
          {/* Jarak */}
          <div className="bg-surface-container-lowest p-space-md rounded-DEFAULT shadow-sm flex flex-col justify-between border border-surface-container/60">
            <div className="flex items-center justify-between text-outline">
              <span className="text-[11px] uppercase font-bold tracking-wider">Jarak</span>
              <span className="material-symbols-outlined text-[15px]">edit</span>
            </div>
            <div className="my-space-xs flex items-baseline gap-1">
              <input
                type="number"
                step="0.01"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                className="font-headline text-[22px] font-extrabold text-on-surface w-20 bg-transparent focus:outline-none"
              />
              <span className="text-[12px] text-on-surface-variant">km</span>
            </div>
            <span className="text-[10px] text-secondary bg-surface-container px-2 py-0.5 rounded-full w-fit font-bold">
              GPS Verified
            </span>
          </div>

          {/* Durasi */}
          <div className="bg-surface-container-lowest p-space-md rounded-DEFAULT shadow-sm flex flex-col justify-between border border-surface-container/60">
            <div className="flex items-center justify-between text-outline">
              <span className="text-[11px] uppercase font-bold tracking-wider">Durasi</span>
              <span className="material-symbols-outlined text-[15px]">edit</span>
            </div>
            <div className="my-space-xs flex items-baseline gap-1">
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value) || 0)}
                className="font-headline text-[20px] font-extrabold text-on-surface w-10 bg-transparent focus:outline-none text-right"
              />
              <span className="font-bold">:</span>
              <input
                type="number"
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value) || 0)}
                className="font-headline text-[20px] font-extrabold text-on-surface w-10 bg-transparent focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-on-surface-variant">Durasi Gerak Aktif</span>
          </div>

          {/* Pace Rerata */}
          <div className="bg-surface-container-lowest p-space-md rounded-DEFAULT shadow-sm flex flex-col justify-between border border-surface-container/60">
            <div className="flex items-center justify-between text-outline">
              <span className="text-[11px] uppercase font-bold tracking-wider">Pace Rerata</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
            </div>
            <div className="my-space-xs flex items-baseline gap-1">
              <span className="font-headline text-[22px] font-extrabold text-primary">{formattedPace}</span>
              <span className="text-[12px] text-on-surface-variant">/km</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span className="text-[10px] text-secondary font-bold">Valid Terkalibrasi</span>
            </div>
          </div>

          {/* Kadens */}
          <div className="bg-surface-container-lowest p-space-md rounded-DEFAULT shadow-sm flex flex-col justify-between border border-surface-container/60">
            <div className="flex items-center justify-between text-outline">
              <span className="text-[11px] uppercase font-bold tracking-wider">Kadens</span>
              <span className="material-symbols-outlined text-[16px]">speed</span>
            </div>
            <div className="my-space-xs flex items-baseline gap-1">
              <input
                type="number"
                value={cadence}
                onChange={(e) => setCadence(parseInt(e.target.value) || 0)}
                className="font-headline text-[22px] font-extrabold text-on-surface w-16 bg-transparent focus:outline-none"
              />
              <span className="text-[12px] text-on-surface-variant">spm</span>
            </div>
            <span className="text-[10px] text-on-surface-variant">Optimal (165-175)</span>
          </div>
        </div>
      </section>

      {/* 5. 5x800m Split Pills Preview */}
      <section className="px-margin-mobile py-space-sm">
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-xs border border-surface-container/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">timer</span>
              <span className="font-headline text-[13px] text-on-surface font-bold">
                Preview Split Interval (5x800m)
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium">Target: 4:10 /km</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
            {[
              { lap: '#1', pace: '4:08', isBest: false },
              { lap: '#2', pace: '4:11', isBest: false },
              { lap: '#3', pace: '4:09', isBest: false },
              { lap: '#4', pace: '4:06', isBest: true },
              { lap: '#5', pace: '4:14', isBest: false },
            ].map((s) => (
              <div
                key={s.lap}
                className={`flex flex-col items-center px-3 py-1.5 rounded-full shrink-0 ${
                  s.isBest ? 'bg-secondary-container shadow-xs' : 'bg-surface-container-high'
                }`}
              >
                <span className={`text-[10px] font-bold ${s.isBest ? 'text-on-secondary-container' : 'text-outline'}`}>
                  {s.lap}
                </span>
                <span className={`font-headline text-[13px] font-extrabold ${s.isBest ? 'text-on-secondary-container' : 'text-on-surface'}`}>
                  {s.pace}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Subjective Bio-Feedback Touch Controls */}
      <section className="px-margin-mobile py-space-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
            <h3 className="font-headline text-[15px] font-bold text-on-surface">
              Bio-Feedback Subjektif
            </h3>
          </div>
          <span className="text-[11px] text-outline">Skala Borg &amp; DOMS</span>
        </div>

        {/* Sliders Card */}
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-md border border-surface-container/60">
          {/* Actual RPE Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-on-surface">Tingkat Usaha (Actual RPE)</label>
              <span className="text-[13px] text-primary font-bold">
                {rpeScore} / 10 <span className="text-on-surface-variant font-normal">({rpeScore >= 8 ? 'Sangat Keras' : rpeScore >= 6 ? 'Keras Terkendali' : 'Ringan/Sedang'})</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={rpeScore}
              onChange={(e) => setRpeScore(parseFloat(e.target.value))}
              className="w-full accent-primary h-2 bg-surface-container rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-outline font-medium">
              <span>1 (Sangat Ringan)</span>
              <span>5 (Sedang)</span>
              <span>10 (Maksimal)</span>
            </div>
          </div>

          {/* DOMS Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-on-surface">Pegal Otot (DOMS Pasca-Lari)</label>
              <span className="text-[13px] text-on-surface font-bold">
                {muscleSoreness} / 10 <span className="text-on-surface-variant font-normal">({muscleSoreness >= 6 ? 'Tinggi' : muscleSoreness >= 4 ? 'Sedang' : 'Ringan'})</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={muscleSoreness}
              onChange={(e) => setMuscleSoreness(parseInt(e.target.value, 10))}
              className="w-full accent-primary h-2 bg-surface-container rounded-full cursor-pointer"
            />
          </div>

          {/* Systemic Fatigue Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-on-surface">Kelelahan Sistemik (SSP)</label>
              <span className="text-[13px] text-on-surface font-bold">
                {fatigueScore} / 10 <span className="text-on-surface-variant font-normal">({fatigueScore >= 7 ? 'Sangat Lelah' : 'Terkendali'})</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={fatigueScore}
              onChange={(e) => setFatigueScore(parseInt(e.target.value, 10))}
              className="w-full accent-primary h-2 bg-surface-container rounded-full cursor-pointer"
            />
          </div>

          {/* Durasi Tidur */}
          <div className="flex items-center justify-between pt-space-xs bg-surface-container-low p-space-sm rounded-DEFAULT">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-outline">bedtime</span>
              <span className="text-[12px] font-medium text-on-surface">Durasi Tidur Semalam</span>
            </div>
            <div className="flex items-center gap-1 font-headline text-[13px] text-on-surface font-bold">
              <input
                type="number"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value) || 0)}
                className="w-12 bg-transparent text-right focus:outline-none"
              />
              <span>Jam</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">check</span>
            </div>
          </div>
        </div>

        {/* Injury & Pain Diagnostics Card (SR-01 & SR-02) */}
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-sm border border-surface-container/60">
          <h4 className="font-headline text-[13px] font-bold text-on-surface">
            Lokasi Sensasi / Nyeri Terlokalisasi
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {availableLocations.map((loc) => {
              const isSelected = selectedLocations.includes(loc);
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggleLocation(loc)}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span>{loc}</span>
                  {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                </button>
              );
            })}
          </div>

          {/* Red Flag Toggles: Sharp Pain & Motion Restriction */}
          <div className="grid grid-cols-1 gap-space-sm pt-space-xs">
            {/* Nyeri Tajam */}
            <div className="bg-surface-container-low p-space-sm rounded-DEFAULT flex items-center justify-between">
              <div>
                <p className="font-headline text-[12px] font-bold text-on-surface">Tipe Nyeri</p>
                <p className="text-[11px] text-on-surface-variant">Sensasi menusuk tajam?</p>
              </div>
              <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-full">
                <button
                  type="button"
                  onClick={() => setSharpPain(false)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    !sharpPain ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  Tumpul (Aman)
                </button>
                <button
                  type="button"
                  onClick={() => setSharpPain(true)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    sharpPain ? 'bg-error text-on-error shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  Tajam
                </button>
              </div>
            </div>

            {/* Keterbatasan Gerak */}
            <div className="bg-surface-container-low p-space-sm rounded-DEFAULT flex items-center justify-between">
              <div>
                <p className="font-headline text-[12px] font-bold text-on-surface">Keterbatasan Gerak</p>
                <p className="text-[11px] text-on-surface-variant">Hambatan menumpu/sendi?</p>
              </div>
              <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-full">
                <button
                  type="button"
                  onClick={() => setFunctionalLimitation(false)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    !functionalLimitation ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  Tidak Ada
                </button>
                <button
                  type="button"
                  onClick={() => setFunctionalLimitation(true)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    functionalLimitation ? 'bg-error text-on-error shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  Ada
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Safety Engine Live Status Banner */}
      <section className="px-margin-mobile py-space-xs">
        <div className={`rounded-lg p-space-md shadow-sm flex items-center gap-space-sm border ${
          isRedFlag
            ? 'bg-error-container/80 border-error/40'
            : isLocked
              ? 'bg-amber-100 border-amber-300'
              : 'bg-surface-container-lowest border-surface-container/60'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isRedFlag ? 'bg-error text-on-error' : isLocked ? 'bg-amber-500 text-white' : 'bg-secondary-container text-on-secondary-container'
          }`}>
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isRedFlag ? 'bg-error' : isLocked ? 'bg-amber-500' : 'bg-secondary'}`}></span>
              <span className={`font-headline text-[11px] font-bold tracking-wide uppercase ${
                isRedFlag ? 'text-error' : isLocked ? 'text-amber-800' : 'text-secondary'
              }`}>
                STATUS SAFETY: {isRedFlag ? 'MEDICAL_HOLD' : isLocked ? 'LOCKED' : 'NORMAL'}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-tight truncate">
              {isRedFlag
                ? 'Terdeteksi red flag. Sesi lari berikutnya ditahan untuk keselamatan.'
                : isLocked
                  ? 'Kenaikan intensitas dikunci sementara. Sesi berikutnya dialihkan ke easy.'
                  : 'Beban aman dan terkendali. Siap untuk adaptasi progresif.'}
            </p>
          </div>
        </div>
      </section>

      {/* 8. Sticky Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-margin-mobile pb-safe bg-surface/90 backdrop-blur-md shadow-lg flex flex-col gap-space-xs z-40 border-t border-surface-container">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3.5 px-space-lg rounded-full bg-primary text-on-primary font-headline text-[14px] font-bold shadow-md active:scale-[0.99] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">save</span>
          <span>{isSubmitting ? 'Memproses Evaluasi...' : 'Konfirmasi & Simpan Log Latihan'}</span>
        </button>
        <button
          onClick={onCancel}
          className="w-full py-2 px-space-lg rounded-full bg-surface-container text-on-surface text-[12px] font-semibold hover:bg-surface-container-high transition-colors text-center"
          type="button"
        >
          Batal / Kembali
        </button>
      </div>
    </div>
  );
}
