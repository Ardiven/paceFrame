import React, { useState } from 'react';
import { apiFetch } from '../services/api.js';

/**
 * OnboardingPage — Inisialisasi Profil Atlet & Pembuatan Rencana Latihan Adaptif (PRD FR-01)
 * Digunakan untuk pengguna baru agar mendapatkan rencana latihan sesuai kapasitas & target pribadi.
 */
export default function OnboardingPage({ session, onComplete }) {
  const initialName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';

  // Form State
  const [fullName, setFullName] = useState(initialName);
  const [selectedGoal, setSelectedGoal] = useState('5K Sub-30');
  const [pb5k, setPb5k] = useState('33:00');
  const [baselineEasyPace, setBaselineEasyPace] = useState('6:45/km');
  const [baselineWeeklyKm, setBaselineWeeklyKm] = useState(16);
  const [selectedDays, setSelectedDays] = useState([2, 4, 0]); // Selasa, Kamis, Minggu
  const [parqConsent, setParqConsent] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const goalOptions = [
    {
      id: '5K Sub-30',
      title: '5K Sub-30',
      subtitle: 'Pace < 6:00/km • Target Rekreasional Populer',
      pace: '5:50 - 6:00 /km',
      nextGoal: '5K Sub-25'
    },
    {
      id: '5K Sub-25',
      title: '5K Sub-25',
      subtitle: 'Pace < 5:00/km • Peningkatan Kecepatan Lanjutan',
      pace: '4:50 - 5:00 /km',
      nextGoal: '5K Sub-20'
    },
    {
      id: '10K Finisher',
      title: '10K Sub-60',
      subtitle: 'Pace < 6:00/km • Transisi Jarak Menengah',
      pace: '5:55 - 6:05 /km',
      nextGoal: 'Half Marathon'
    },
    {
      id: '5K Finisher',
      title: '5K Pertama (Finisher)',
      subtitle: 'Membangun Fondasi Aerobik & Kebiasaan Konsisten',
      pace: '6:30 - 7:00 /km',
      nextGoal: '5K Sub-30'
    }
  ];

  const daysList = [
    { day: 1, label: 'Senin', short: 'Sen' },
    { day: 2, label: 'Selasa', short: 'Sel' },
    { day: 3, label: 'Rabu', short: 'Rab' },
    { day: 4, label: 'Kamis', short: 'Kam' },
    { day: 5, label: 'Jumat', short: 'Jum' },
    { day: 6, label: 'Sabtu', short: 'Sab' },
    { day: 0, label: 'Minggu', short: 'Min' },
  ];

  const toggleDay = (dayNum) => {
    if (selectedDays.includes(dayNum)) {
      if (selectedDays.length <= 2) {
        setErrorMsg('Pilih minimal 2 hari latihan per minggu.');
        return;
      }
      setSelectedDays(selectedDays.filter(d => d !== dayNum));
    } else {
      setSelectedDays([...selectedDays, dayNum]);
    }
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Mohon isi nama lengkap atau panggilan Anda.');
      return;
    }
    if (!parqConsent) {
      setErrorMsg('Persetujuan kondisi kebugaran (PAR-Q) wajib dicentang untuk keselamatan latihan.');
      return;
    }
    if (selectedDays.length < 2) {
      setErrorMsg('Pilih minimal 2 hari latihan dalam seminggu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const chosenGoalObj = goalOptions.find(g => g.id === selectedGoal) || goalOptions[0];

    try {
      const payload = {
        fullName: fullName.trim(),
        goalStage1: chosenGoalObj.title,
        goalStage1Pace: chosenGoalObj.pace,
        goalStage2: chosenGoalObj.nextGoal,
        pb5k: pb5k.trim() || 'Belum ada',
        baselineEasyPace: baselineEasyPace.trim() || '6:45/km',
        baselineWeeklyKm: Number(baselineWeeklyKm) || 15,
        trainingDays: selectedDays,
        strictDayLock: true,
        parqConsent: true
      };

      const res = await apiFetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, session);

      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.error || 'Gagal menyimpan rencana latihan');
      }

      if (onComplete) {
        onComplete(data.profile);
      }
    } catch (err) {
      console.error('[Onboarding error]:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat membuat rencana latihan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col justify-center px-4 py-8 max-w-lg mx-auto">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-2 mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined text-[30px]">tune</span>
        </div>
        <h1 className="font-headline text-[22px] font-bold text-on-surface">
          Personalisasi Program Latihan
        </h1>
        <p className="text-[13px] text-on-surface-variant max-w-xs">
          Masukkan baseline &amp; target Anda agar AI Coach dapat menyusun jadwal latihan yang aman dan terukur.
        </p>
      </div>

      {/* Onboarding Form Card */}
      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container/60 flex flex-col gap-5">
        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-error/10 border border-error/30 rounded-xl p-3 flex items-start gap-2">
            <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">error</span>
            <span className="text-[12px] text-error leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* 1. Nama Atlet */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-outline uppercase font-bold tracking-wider">
            Nama Anda
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container text-on-surface text-[14px] border border-surface-container focus:outline-none focus:border-primary font-medium"
            required
          />
        </div>

        {/* 2. Target Milestone Utama */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-outline uppercase font-bold tracking-wider">
            Target Milestone Utama (Pilih Salah Satu)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {goalOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedGoal(opt.id)}
                className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between ${
                  selectedGoal === opt.id
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-surface-container bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div>
                  <div className="font-headline text-[14px] font-bold text-on-surface flex items-center gap-1.5">
                    {opt.title}
                    {selectedGoal === opt.id && (
                      <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    )}
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                    {opt.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Baseline Saat Ini: PB & Easy Pace */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-outline uppercase font-bold tracking-wider">
              PB 5K Saat Ini
            </label>
            <input
              type="text"
              value={pb5k}
              onChange={(e) => setPb5k(e.target.value)}
              placeholder="33:00 / Belum ada"
              className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-[13px] border border-surface-container focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-outline uppercase font-bold tracking-wider">
              Pace Santai (Easy Run)
            </label>
            <input
              type="text"
              value={baselineEasyPace}
              onChange={(e) => setBaselineEasyPace(e.target.value)}
              placeholder="6:45/km"
              className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-[13px] border border-surface-container focus:outline-none focus:border-primary font-medium"
            />
          </div>
        </div>

        {/* 4. Kapasitas Volume Mingguan */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-outline uppercase font-bold tracking-wider">
              Estimasi Jarak Mingguan Saat Ini
            </span>
            <span className="font-bold text-primary text-[13px]">{baselineWeeklyKm} km / minggu</span>
          </div>
          <input
            type="range"
            min="6"
            max="45"
            step="1"
            value={baselineWeeklyKm}
            onChange={(e) => setBaselineWeeklyKm(e.target.value)}
            className="w-full accent-primary cursor-pointer"
          />
        </div>

        {/* 5. Hari Latihan Pilihan */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-outline uppercase font-bold tracking-wider">
            Pilih Hari Latihan dalam Seminggu ({selectedDays.length} hari terpilih)
          </label>
          <div className="grid grid-cols-7 gap-1">
            {daysList.map((d) => {
              const isSelected = selectedDays.includes(d.day);
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => toggleDay(d.day)}
                  className={`py-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span>{d.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. PAR-Q Health Screening & Privacy */}
        <div className="bg-surface-container-low rounded-xl p-3 border border-surface-container/60 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
            <span className="font-headline text-[12px] font-bold">Skrining Kesehatan Olahraga (PAR-Q)</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Anda menyatakan tidak memiliki keluhan nyeri dada, riwayat penyakit jantung tidak terkontrol, atau cedera muskuloskeletal akut yang melarang aktivitas berlari.
          </p>
          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={parqConsent}
              onChange={(e) => setParqConsent(e.target.checked)}
              className="mt-0.5 accent-primary rounded cursor-pointer w-4 h-4"
            />
            <span className="text-[11.5px] text-on-surface font-semibold leading-snug">
              Saya menyatakan kondisi fisik saya aman untuk berolahraga dan menyetujui program adaptif PaceFrame AI (Kepatuhan UU PDP).
            </span>
          </label>
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              <span>Menyusun Rencana Adaptif...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              <span>Mulai Program Latihan Saya</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
