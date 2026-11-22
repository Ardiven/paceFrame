import React, { useState } from 'react';

export default function Onboarding({ onComplete, onCancel }) {
  const [step, setStep] = useState(1); // 1: Consent & PAR-Q, 2: Baseline & Target, 3: Days Selection

  // Form State
  const [consentHealthData, setConsentHealthData] = useState(true);
  const [parqPassed, setParqPassed] = useState(true);
  const [target5k, setTarget5k] = useState('Sub-30 (Pace < 6:00/km)');
  const [currentPb, setCurrentPb] = useState('32:30');
  const [weeklyKm, setWeeklyKm] = useState(18);
  const [selectedDays, setSelectedDays] = useState(['selasa', 'kamis', 'minggu']);
  const [strictLock, setStrictLock] = useState(true);

  const daysList = [
    { id: 'senin', name: 'SENIN', tag: 'Rest Pasif', desc: 'Adaptasi Neuromuskular & sintesis glikogen', icon: 'bed' },
    { id: 'selasa', name: 'SELASA', tag: 'Kunci Kualitas', desc: 'Interval & Penguatan Otot (Speed Threshold)', icon: 'bolt', isKey: true },
    { id: 'rabu', name: 'RABU', tag: 'Rest Pasif', desc: 'Pemulihan pasca-interval', icon: 'bed' },
    { id: 'kamis', name: 'KAMIS', tag: 'Aerobik Dasar', desc: 'Easy Recovery Run (Zona 2 Percakapan)', icon: 'directions_run', isKey: true },
    { id: 'jumat', name: 'JUMAT', tag: 'Rest Pasif', desc: 'Regenerasi jaringan ikat & tendon', icon: 'bed' },
    { id: 'sabtu', name: 'SABTU', tag: 'Fleksibel', desc: 'Opsional Mobilitas & Core Strength', icon: 'self_improvement' },
    { id: 'minggu', name: 'MINGGU', tag: 'Fokus Volume', desc: 'Long Run Aerobik (Kapiler & Mitokondria)', icon: 'terrain', isKey: true },
  ];

  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(d => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleFinish = () => {
    onComplete({
      consentHealthData,
      parqPassed,
      target5k,
      currentPb,
      weeklyKm,
      selectedDays,
      strictLock
    });
  };

  return (
    <div className="flex flex-col w-full pb-32 animate-fade-in">
      {/* 1. Stepper Header */}
      <div className="px-margin-mobile pt-space-xs pb-space-sm flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-headline text-[10px] font-bold uppercase tracking-wider">
              SMART ONBOARDING
            </span>
            <span className="text-[12px] text-on-surface-variant font-medium">
              Langkah {step} dari 3
            </span>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-1">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* ================= STEP 1: CONSENT & PAR-Q ================= */}
      {step === 1 && (
        <div className="px-margin-mobile flex flex-col gap-space-sm animate-fade-in">
          <div>
            <h2 className="font-headline text-[22px] font-bold text-on-surface">
              Persetujuan &amp; Kesiapan Medis (PAR-Q)
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-0.5">
              PaceFrame AI memprioritaskan keselamatan atlet sebelum merancang beban latihan.
            </p>
          </div>

          {/* Consent Health Data */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container/60 flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                checked={consentHealthData}
                onChange={(e) => setConsentHealthData(e.target.checked)}
                className="w-5 h-5 accent-primary mt-0.5 rounded cursor-pointer shrink-0"
              />
              <label htmlFor="consent" className="text-[13px] text-on-surface cursor-pointer leading-snug">
                <strong className="block font-bold">Persetujuan Pemrosesan Data Kesehatan</strong>
                Saya menyetujui PaceFrame AI memproses data jarak, durasi, detak jantung, dan keluhan fisik secara privat sesuai UU No. 27 Tahun 2022 (UU PDP).
              </label>
            </div>
          </div>

          {/* PAR-Q Screening */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container/60 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">health_and_safety</span>
              <h3 className="font-headline text-[14px] font-bold text-on-surface">
                Skrining Awal (Physical Activity Readiness)
              </h3>
            </div>
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              Apakah Anda pernah mengalami nyeri dada saat olahraga, pusing berat, atau memiliki kondisi sendi/tulang yang membatasi lari intensitas tinggi?
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setParqPassed(true)}
                className={`flex-1 py-2.5 rounded-full text-[12px] font-bold transition-all ${
                  parqPassed
                    ? 'bg-secondary-container text-on-secondary-container shadow-xs'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Tidak Ada (Aman)
              </button>
              <button
                type="button"
                onClick={() => setParqPassed(false)}
                className={`flex-1 py-2.5 rounded-full text-[12px] font-bold transition-all ${
                  !parqPassed
                    ? 'bg-error-container text-error shadow-xs'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Ada Keluhan Medis
              </button>
            </div>

            {!parqPassed && (
              <div className="p-3 bg-error-container/40 rounded-lg text-error text-[11px] leading-relaxed">
                <strong>Catatan Keselamatan:</strong> Karena ada keluhan medis, sistem akan membatasi target intensitas dan menyarankan evaluasi dokter olahraga sebelum latihan berat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STEP 2: BASELINE & TARGET ================= */}
      {step === 2 && (
        <div className="px-margin-mobile flex flex-col gap-space-sm animate-fade-in">
          <div>
            <h2 className="font-headline text-[22px] font-bold text-on-surface">
              Baseline Kemampuan &amp; Sasaran
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-0.5">
              Program lari disusun dari kondisi riil Anda saat ini, bukan ekspektasi yang dipaksakan.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container/60 flex flex-col gap-3">
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider block mb-1">
                Target Utama (Milestone Tahap 1)
              </label>
              <select
                value={target5k}
                onChange={(e) => setTarget5k(e.target.value)}
                className="w-full bg-surface-container-low p-2.5 rounded-lg text-[13px] font-bold text-on-surface focus:outline-none"
              >
                <option value="Sub-30 (Pace < 6:00/km)">5K Sub-30 (Pace &lt; 6:00/km) • Target Utama</option>
                <option value="Sub-32 (Pace < 6:24/km)">5K Sub-32 (Pace &lt; 6:24/km) • Fondasi</option>
                <option value="Sub-25 (Pace < 5:00/km)">5K Sub-25 (Pace &lt; 5:00/km) • Lanjutan</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider block mb-1">
                Personal Best (PB) 5K Terakhir
              </label>
              <input
                type="text"
                value={currentPb}
                onChange={(e) => setCurrentPb(e.target.value)}
                placeholder="Contoh: 32:30"
                className="w-full bg-surface-container-low p-2.5 rounded-lg text-[14px] font-bold text-on-surface focus:outline-none"
              />
              <span className="text-[11px] text-outline mt-1 block">Waktu terbaik 5K yang pernah Anda selesaikan.</span>
            </div>

            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider block mb-1">
                Volume Lari Mingguan Saat Ini (km/pekan)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={weeklyKm}
                  onChange={(e) => setWeeklyKm(parseInt(e.target.value, 10))}
                  className="flex-1 accent-primary h-2 bg-surface-container rounded-full cursor-pointer"
                />
                <span className="font-headline text-[16px] font-extrabold text-primary w-14 text-right">
                  {weeklyKm} km
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 3: KETERSEDIAAN HARI LATIHAN ================= */}
      {step === 3 && (
        <div className="px-margin-mobile flex flex-col gap-space-sm animate-fade-in">
          <div>
            <h2 className="font-headline text-[22px] font-bold text-on-surface">
              Hari Latihan Mingguan
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-0.5">
              Pilih 3–4 hari untuk komitmen lari terarah. AI merancang jeda pemulihan optimal.
            </p>
          </div>

          {/* Target Beban Bar */}
          <div className="bg-surface-container-low rounded-lg p-space-md flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">fitness_center</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Target Beban</span>
                <span className="font-headline text-[14px] text-on-surface font-bold">
                  {selectedDays.length} Sesi Lari / Pekan
                </span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
              {selectedDays.length === 3 ? 'Sangat Direkomendasikan' : 'Fleksibel'}
            </span>
          </div>

          {/* Days Cards */}
          <div className="flex flex-col gap-2">
            {daysList.map((d) => {
              const isSelected = selectedDays.includes(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => toggleDay(d.id)}
                  className={`rounded-lg p-3 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                    isSelected
                      ? 'bg-surface-container-low border-primary/40 shadow-primary/5'
                      : 'bg-surface-container-lowest border-surface-container/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-headline text-[13px] font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                          {d.name}
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold">
                          {d.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{d.desc}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-outline shrink-0 ml-2">
                    {d.icon}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Strict Day Lock Switch */}
          <div className="bg-surface-container-lowest rounded-lg p-3 shadow-sm flex items-center justify-between border border-surface-container/60">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">lock_reset</span>
              <div>
                <p className="font-headline text-[12px] font-bold text-on-surface">Strict Day Lock (SR-07)</p>
                <p className="text-[11px] text-on-surface-variant leading-snug">
                  Mencegah AI memindahkan hari latihan inti secara otomatis tanpa persetujuan eksplisit.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStrictLock(!strictLock)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                strictLock ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  strictLock ? 'translate-x-5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
        </div>
      )}

      {/* ================= STICKY BOTTOM ACTIONS ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md px-margin-mobile py-space-sm pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex flex-col gap-space-xs border-t border-surface-container">
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && !consentHealthData}
            className="w-full h-12 rounded-full bg-primary text-on-primary font-headline text-[14px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span>Lanjut Langkah Berikutnya</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={selectedDays.length === 0}
            className="w-full h-12 rounded-full bg-primary text-on-primary font-headline text-[14px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
            <span>Simpan &amp; Kalibrasi Program Lari</span>
          </button>
        )}

        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="text-[12px] text-on-surface-variant font-medium py-1 text-center"
          >
            Kembali ke Langkah {step - 1}
          </button>
        )}
      </div>
    </div>
  );
}
