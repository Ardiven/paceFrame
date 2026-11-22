/**
 * Safety Thresholds Configuration (PRD Bagian 2.3 & 2.4)
 * Semua ambang batas didefinisikan di sini agar mudah divalidasi oleh pelatih/fisioterapis.
 */
export const SAFETY_THRESHOLDS = {
  // SR-01: Red Flags (Pemicu MEDICAL_HOLD)
  RED_FLAGS: {
    MAX_LOCALIZED_PAIN: 6, // Nyeri lokal >= 6 memicu hold
  },

  // SR-02: Nyeri lokal berulang (Pemicu LOCKED)
  PERSISTENT_PAIN: {
    MIN_LOCALIZED_PAIN: 3,
    MAX_LOCALIZED_PAIN: 5,
  },

  // SR-03: DOMS / Pegal otot (Pemicu CAUTION)
  SORENESS: {
    HIGH_THRESHOLD: 6,      // Sekali pegal >= 6
    CONSECUTIVE_THRESHOLD: 4, // 2 log berturut-turut >= 4
  },

  // SR-04: Sleep deprivation & Fatigue (Pemicu CAUTION & Usulan Deload)
  FATIGUE_SLEEP: {
    MIN_SLEEP_HOURS: 6.0,   // Kurang dari 6 jam
    MIN_DEFICIT_NIGHTS: 2,  // Minimal 2 dari 3 malam terakhir
    EXCESS_RPE_DELTA: 2,    // RPE aktual >= Target RPE + 2
    HIGH_FATIGUE_SCORE: 7,  // Kelelahan umum >= 7
  },

  // SR-05: Batas kenaikan volume mingguan
  PROGRESSION: {
    MAX_WEEKLY_VOLUME_INCREASE_PCT: 0.10, // Maks 10% per minggu
  },

  // State Machine States
  STATES: {
    NORMAL: 'NORMAL',
    CAUTION: 'CAUTION',
    LOCKED: 'LOCKED',
    MEDICAL_HOLD: 'MEDICAL_HOLD',
  },
};
