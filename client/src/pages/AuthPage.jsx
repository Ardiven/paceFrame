import React, { useState } from 'react';
import { supabase } from '../services/supabase.js';

/**
 * AuthPage — Halaman Login & Registrasi Multi-Pengguna (PRD FR-01)
 * Mendukung: Email + Password (signUp / signInWithPassword)
 * UI: Material 3 Green theme, Bahasa Indonesia
 */
export default function AuthPage({ onLogin }) {
  const [tab, setTab] = useState('masuk'); // 'masuk' | 'daftar'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
  };

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    resetForm();
  };

  const handleMasuk = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('Email atau kata sandi salah. Silakan coba lagi.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email belum dikonfirmasi. Cek kotak masuk email Anda.');
        } else {
          setError('Gagal masuk: ' + authError.message);
        }
        return;
      }
      if (data?.session) {
        onLogin(data.session);
      }
    } catch (err) {
      setError('Terjadi kesalahan. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleDaftar = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Semua kolom wajib diisi.');
      return;
    }
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Email ini sudah terdaftar. Gunakan opsi "Masuk".');
        } else {
          setError('Gagal mendaftar: ' + authError.message);
        }
        return;
      }
      // Jika email konfirmasi tidak diperlukan (auto-confirm on)
      if (data?.session) {
        onLogin(data.session);
        return;
      }
      setSuccessMsg('Pendaftaran berhasil! Cek email Anda dan klik tautan konfirmasi sebelum masuk.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Terjadi kesalahan saat mendaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-12 font-body">
      {/* Logo & Branding */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined text-on-primary text-[32px]">sprint</span>
        </div>
        <div className="text-center">
          <h1 className="font-headline text-[22px] font-bold text-on-surface tracking-tight">PaceFrame AI</h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">Pelatih Lari Adaptif Berbasis AI</p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container/60 overflow-hidden">
        {/* Tab Switcher */}
        <div className="flex border-b border-surface-container">
          <button
            type="button"
            onClick={() => handleTabSwitch('masuk')}
            className={`flex-1 py-3.5 text-[13px] font-bold transition-colors ${
              tab === 'masuk'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('daftar')}
            className={`flex-1 py-3.5 text-[13px] font-bold transition-colors ${
              tab === 'daftar'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Daftar
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* Error Banner */}
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0">error</span>
              <p className="text-[12px] text-error leading-relaxed">{error}</p>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">check_circle</span>
              <p className="text-[12px] text-primary leading-relaxed">{successMsg}</p>
            </div>
          )}

          {/* Form Masuk */}
          {tab === 'masuk' && (
            <form onSubmit={handleMasuk} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-outline uppercase font-bold tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface text-[14px] border border-surface-container focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-outline uppercase font-bold tracking-wider">Kata Sandi</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface text-[14px] border border-surface-container focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant/50"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-[14px] flex items-center justify-center gap-2 active:opacity-80 disabled:opacity-60 transition-opacity shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    Masuk
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form Daftar */}
          {tab === 'daftar' && (
            <form onSubmit={handleDaftar} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-outline uppercase font-bold tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface text-[14px] border border-surface-container focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-outline uppercase font-bold tracking-wider">Kata Sandi</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface text-[14px] border border-surface-container focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-outline uppercase font-bold tracking-wider">Konfirmasi Kata Sandi</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface text-[14px] border border-surface-container focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant/50"
                />
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0">security</span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Data biometrik Anda diproses secara anonim sesuai <strong>UU PDP</strong>. Anda dapat mengekspor atau menghapus data kapan saja.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-[14px] flex items-center justify-center gap-2 active:opacity-80 disabled:opacity-60 transition-opacity shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Mendaftarkan...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Buat Akun
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-[11px] text-on-surface-variant/60 text-center max-w-xs leading-relaxed">
        PaceFrame AI — Pelatih lari adaptif personal. Data berjalan hanya di server Anda sendiri.
      </p>
    </div>
  );
}
