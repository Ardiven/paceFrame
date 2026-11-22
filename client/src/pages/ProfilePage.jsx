import React, { useState } from 'react';
import { apiFetch } from '../services/api.js';

export default function ProfilePage({ session, athleteProfile = null, onLogout }) {
  const userEmail = session?.user?.email || 'victor@paceframe.local';
  const displayName = athleteProfile?.full_name || session?.user?.user_metadata?.full_name || userEmail.split('@')[0] || 'Victor Thimothi';
  const initials = displayName
    .split(' ')
    .map(n => n[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');

  const daysMap = {
    0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu'
  };
  const formattedDays = athleteProfile?.training_days
    ? athleteProfile.training_days.map(d => daysMap[d] || d).join(', ')
    : 'Minggu (Long Run), Selasa (Interval + Strength), Kamis (Easy Run)';

  const athlete = {
    name: displayName,
    goalStage1: athleteProfile?.goal_stage1 ? `${athleteProfile.goal_stage1} (Pace ${athleteProfile.goal_stage1_pace || '< 6:00/km'})` : '5K Sub-30 (Pace < 6:00/km)',
    goalStage2: athleteProfile?.goal_stage2 || '5K Sub-25 (Pace < 5:00/km)',
    currentPb: athleteProfile?.pb_5k_sec ? `${Math.floor(athleteProfile.pb_5k_sec / 60)}:${(athleteProfile.pb_5k_sec % 60).toString().padStart(2, '0')}` : '32:30',
    easyPace: athleteProfile?.baseline_easy_pace || '6:30 - 6:45 /km',
    weeklyDays: formattedDays,
    shoes: 'Rotasi sepatu latihan harian & tempo'
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await apiFetch('/api/account/export', {}, session);
      if (!res.ok) throw new Error('Gagal mengunduh file ekspor');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PaceFrame_Data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Gagal mengekspor data: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await apiFetch('/api/account', { method: 'DELETE' }, session);
      if (!res.ok) throw new Error('Gagal menghapus akun');
      alert('Akun dan semua data latihan berhasil dihapus.');
      if (onLogout) onLogout();
    } catch (err) {
      alert('Gagal menghapus akun: ' + err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col w-full px-margin-mobile pb-28 gap-space-md animate-fade-in">
      {/* Header */}
      <div className="pt-space-xs flex items-center gap-space-sm">
        <div className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline text-[22px] font-bold shadow-sm">
          {initials || 'VT'}
        </div>
        <div>
          <h2 className="font-headline text-[18px] font-bold text-on-surface">
            {athlete.name}
          </h2>
          <span className="text-[12px] text-secondary font-semibold">
            {session ? userEmail : 'Goal-Driven Recreational Runner (MVP)'}
          </span>
        </div>
      </div>

      {/* Target Milestone */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-2.5 border border-surface-container/60">
        <span className="text-[11px] text-outline uppercase font-bold tracking-wider">
          Target &amp; Milestone
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-on-surface-variant">Tahap 1 Utama:</span>
            <span className="font-bold text-primary">{athlete.goalStage1}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-on-surface-variant">Tahap 2 Lanjutan:</span>
            <span className="font-bold text-on-surface">{athlete.goalStage2}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-on-surface-variant">PB 5K Baseline:</span>
            <span className="font-bold text-on-surface">{athlete.currentPb}</span>
          </div>
        </div>
      </div>

      {/* Training Preferences */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-2.5 border border-surface-container/60">
        <span className="text-[11px] text-outline uppercase font-bold tracking-wider">
          Hari &amp; Pola Latihan
        </span>
        <div className="bg-surface-container-low rounded-lg p-3 text-[12px] text-on-surface leading-relaxed">
          {athlete.weeklyDays}
        </div>
        <div className="text-[12px] text-on-surface-variant">
          <span className="font-bold text-on-surface">Rotasi Sepatu:</span> {athlete.shoes}
        </div>
      </div>

      {/* Data Privacy & Consent (PRD FR-07) */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-2 border border-surface-container/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">security</span>
          <h3 className="font-headline text-[13px] font-bold text-on-surface">
            Privasi &amp; Data Kesehatan (UU PDP)
          </h3>
        </div>
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          Data biometrik dan tangkapan layar disimpan secara privat. AI hanya menerima data tanpa identitas sensitif (anonymized prompt injection).
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="flex-1 py-2 px-3 rounded-full bg-surface-container active:bg-surface-container-high text-on-surface text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">download</span>
            {isExporting ? 'Mengekspor...' : 'Ekspor Data (.JSON)'}
          </button>
        </div>
      </div>

      {/* Logout & Delete Account */}
      {onLogout && (
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-surface-container/60">
          <span className="text-[11px] text-outline uppercase font-bold tracking-wider">
            Akun
          </span>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-3 px-4 rounded-xl border border-secondary-container text-secondary font-bold text-[13px] flex items-center justify-center gap-2 active:bg-secondary-container/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Keluar dari Akun
          </button>

          {/* Delete Account */}
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 px-4 rounded-xl text-error text-[12px] font-semibold flex items-center justify-center gap-1.5 active:bg-error/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              Hapus Akun &amp; Semua Data
            </button>
          ) : (
            <div className="bg-error/10 border border-error/30 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-[12px] text-error font-semibold text-center">
                ⚠️ Tindakan ini tidak dapat dibatalkan. Semua data latihan akan dihapus permanen.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg bg-surface-container text-on-surface text-[12px] font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-lg bg-error text-on-error text-[12px] font-bold disabled:opacity-60"
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
