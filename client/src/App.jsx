import React, { useState, useEffect } from 'react';
import Header from './components/common/Header.jsx';
import BottomNav from './components/common/BottomNav.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import WorkoutLogModal from './components/WorkoutLogModal.jsx';
import CoachChatBox from './components/CoachChatBox.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import { supabase, isSupabaseReady } from './services/supabase.js';
import { apiFetch } from './services/api.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [latestEvaluation, setLatestEvaluation] = useState(null);
  const [latestLog, setLatestLog] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [athleteProfile, setAthleteProfile] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [selectedScheduleForLog, setSelectedScheduleForLog] = useState(null);
  const [safetyState, setSafetyState] = useState({
    state: 'NORMAL',
    ruleId: null,
    title: 'Status: NORMAL (Optimal)'
  });

  // === AUTH STATE ===
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Inisialisasi auth dari Supabase
  useEffect(() => {
    if (!isSupabaseReady || !supabase) {
      // Single-user mode: langsung pakai app tanpa login
      setAuthLoading(false);
      return;
    }

    // Ambil session aktif yang sudah ada
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });

    // Subscribe perubahan auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Refresh data saat session berubah (login berhasil)
  useEffect(() => {
    if (!authLoading) {
      checkOnboardingAndLoadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id]);

  const checkOnboardingAndLoadData = async () => {
    try {
      const res = await apiFetch('/api/onboarding/status', {}, session);
      const data = await res.json();
      if (data.needsOnboarding) {
        setNeedsOnboarding(true);
        return;
      }
      setNeedsOnboarding(false);
      if (data.profile) {
        setAthleteProfile(data.profile);
      }
      refreshSchedules();
      refreshLogs();
    } catch (err) {
      console.warn('Gagal memeriksa status onboarding:', err);
      refreshSchedules();
      refreshLogs();
    }
  };

  const handleOnboardingCompleted = (newProfile) => {
    setNeedsOnboarding(false);
    if (newProfile) {
      setAthleteProfile(newProfile);
    }
    refreshSchedules();
    refreshLogs();
    setActiveTab('overview');
  };

  const refreshSchedules = async () => {
    try {
      const res = await apiFetch('/api/schedules', {}, session);
      const data = await res.json();
      if (data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.warn('Gagal memuat jadwal latihan:', err);
    }
  };

  const refreshLogs = async () => {
    try {
      const [latestRes, allRes] = await Promise.all([
        apiFetch('/api/coach/logs/latest', {}, session),
        apiFetch('/api/coach/logs/all', {}, session)
      ]);
      const latestData = await latestRes.json();
      const allData = await allRes.json();

      if (latestData.latestLog) {
        setLatestLog(latestData.latestLog);
        if (latestData.latestLog.ai_evaluation_md) {
          setLatestEvaluation(latestData.latestLog.ai_evaluation_md);
        }
      }
      if (latestData.safetyState) {
        setSafetyState(latestData.safetyState);
      }
      if (allData.logs) {
        setAllLogs(allData.logs);
      }
    } catch (err) {
      console.warn('Gagal memuat log latihan:', err);
    }
  };

  const handleOpenLog = (schedule = null) => {
    setSelectedScheduleForLog(schedule);
    setActiveTab('log');
  };

  const handleWorkoutSaved = (data) => {
    if (data.safetyState) {
      setSafetyState(data.safetyState);
    }
    if (data.aiEvaluationMarkdown) {
      setLatestEvaluation(data.aiEvaluationMarkdown);
    }
    if (data.log) {
      setLatestLog(data.log);
      setAllLogs(prev => [data.log, ...prev.filter(l => l.id !== data.log.id)]);
    }
    refreshSchedules();
    refreshLogs();
    setActiveTab('coach');
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setLatestLog(null);
    setLatestEvaluation(null);
    setSchedules([]);
    setSafetyState({ state: 'NORMAL', ruleId: null, title: 'Status: NORMAL (Optimal)' });
    setActiveTab('overview');
  };

  // === LOADING STATE ===
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-on-primary text-[24px]">sprint</span>
          </div>
          <p className="text-[13px] text-on-surface-variant">Memuat PaceFrame AI...</p>
        </div>
      </div>
    );
  }

  // === AUTH GATE: Tampilkan halaman login jika Supabase aktif tapi belum login ===
  if (isSupabaseReady && supabase && !session) {
    return <AuthPage onLogin={(s) => setSession(s)} />;
  }

  // === ONBOARDING GATE: Pengguna baru wajib mengisi target & data awal ===
  if (needsOnboarding) {
    return (
      <OnboardingPage
        session={session}
        onComplete={handleOnboardingCompleted}
      />
    );
  }

  // === MAIN APP ===
  return (
    <div className="flex flex-col min-h-screen bg-surface font-body text-on-surface antialiased select-none">
      {/* Top Mobile App Header */}
      <Header
        safetyState={safetyState}
        onOpenProfile={() => setActiveTab('profile')}
      />

      {/* Main Scrollable View Area */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-20 bg-surface">
        {activeTab === 'overview' && (
          <Dashboard
            onNavigate={(tab, schedule) => {
              if (tab === 'log') {
                handleOpenLog(schedule || null);
              } else {
                setActiveTab(tab);
              }
            }}
            safetyState={safetyState}
            athleteProfile={athleteProfile}
            schedules={schedules}
            latestLog={latestLog}
            allLogs={allLogs}
            latestEvaluation={latestEvaluation}
          />
        )}

        {activeTab === 'plan' && (
          <SchedulePage
            schedules={schedules}
            onRefresh={refreshSchedules}
            onLogSession={(schedule) => handleOpenLog(schedule)}
            session={session}
          />
        )}

        {activeTab === 'log' && (
          <WorkoutLogModal
            schedules={schedules}
            selectedSchedule={selectedScheduleForLog}
            onSaveSuccess={handleWorkoutSaved}
            onCancel={() => {
              setSelectedScheduleForLog(null);
              setActiveTab('overview');
            }}
            session={session}
          />
        )}

        {activeTab === 'coach' && (
          <CoachChatBox
            latestEvaluation={latestEvaluation}
            safetyState={safetyState}
            latestLog={latestLog}
            allLogs={allLogs}
            schedules={schedules}
            onMutationApproved={refreshSchedules}
            session={session}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage
            session={session}
            athleteProfile={athleteProfile}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
