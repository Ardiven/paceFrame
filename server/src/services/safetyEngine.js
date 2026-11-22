import { SAFETY_THRESHOLDS } from '../config/safetyThresholds.js';

/**
 * Deterministic Safety Engine (PRD Bagian 2.3 & 2.4)
 * Menentukan status keselamatan atlet secara deterministik tanpa bergantung pada LLM.
 */
export class SafetyEngine {
  /**
   * Mengevaluasi log latihan & keluhan fisik untuk menentukan status Safety.
   * @param {Object} input
   * @param {number} input.muscleSoreness - Pegal otot (0-10)
   * @param {number} input.localizedPain - Nyeri lokal (0-10)
   * @param {string} input.painLocation - Lokasi nyeri
   * @param {boolean} input.sharpPain - Nyeri tajam menusuk (Red flag)
   * @param {boolean} input.functionalLimitation - Keterbatasan fungsi (Red flag)
   * @param {boolean} [input.chestPain] - Nyeri dada (Red flag)
   * @param {boolean} [input.dizziness] - Pusing/hampir pingsan (Red flag)
   * @param {boolean} [input.sessionStoppedEarly] - Sesi dihentikan dini karena nyeri
   * @param {number} input.fatigueScore - Kelelahan umum (1-10)
   * @param {number} input.sleepHours - Durasi tidur semalam
   * @param {number} [input.targetRpe] - Target RPE yang direncanakan
   * @param {number} [input.actualRpe] - RPE aktual yang dirasakan
   * @param {string} [currentState] - Status Safety saat ini (NORMAL, CAUTION, LOCKED, MEDICAL_HOLD)
   * @param {Array} [recentLogs] - Log latihan sebelumnya untuk mendeteksi tren kumulatif
   * @returns {Object} { newState, triggeredRule, actionAdvice, allowedMutations }
   */
  static evaluate({
    muscleSoreness = 0,
    localizedPain = 0,
    painLocation = '',
    sharpPain = false,
    functionalLimitation = false,
    chestPain = false,
    dizziness = false,
    sessionStoppedEarly = false,
    fatigueScore = 1,
    sleepHours = 7,
    targetRpe = 5,
    actualRpe = 5,
    currentState = SAFETY_THRESHOLDS.STATES.NORMAL,
    recentLogs = [],
  }) {
    // 1. EVALUASI SR-01: Red Flags (MEDICAL_HOLD)
    const isRedFlag =
      chestPain ||
      dizziness ||
      sharpPain ||
      functionalLimitation ||
      localizedPain >= SAFETY_THRESHOLDS.RED_FLAGS.MAX_LOCALIZED_PAIN;

    if (isRedFlag) {
      return {
        state: SAFETY_THRESHOLDS.STATES.MEDICAL_HOLD,
        ruleId: 'SR-01',
        title: 'Peringatan Medis: Aktivitas Ditahan',
        reason: 'Terdeteksi gejala red-flag (nyeri tajam, hambatan fungsi, atau nyeri tinggi). Sesi lari berikutnya ditahan.',
        action: 'HOLD_NEXT_SESSIONS',
        allowSubstitute: false,
        advice: 'PaceFrame bukan alat diagnosis medis. Segera istirahatkan tubuh dan konsultasikan ke dokter olahraga atau fisioterapis.'
      };
    }

    // 2. EVALUASI SR-02: Nyeri Lokal Berulang atau Sesi Dihentikan Dini (LOCKED)
    const isSessionStopped = sessionStoppedEarly && localizedPain > 0;
    const isPersistentPain =
      localizedPain >= SAFETY_THRESHOLDS.PERSISTENT_PAIN.MIN_LOCALIZED_PAIN &&
      localizedPain <= SAFETY_THRESHOLDS.PERSISTENT_PAIN.MAX_LOCALIZED_PAIN;

    if (isSessionStopped || isPersistentPain) {
      return {
        state: SAFETY_THRESHOLDS.STATES.LOCKED,
        ruleId: 'SR-02',
        title: 'Status: LOCKED (Kunci Progres)',
        reason: `Terdeteksi ${isSessionStopped ? 'sesi dihentikan dini karena nyeri' : 'nyeri lokal (' + painLocation + ')'}. Kenaikan jarak/intensitas dikunci.`,
        action: 'LOCK_PROGRESSION',
        downgradeSession: true, // Ubah Interval jadi Easy / sisipkan Reset Walk 60-90 detik
        advice: 'Kenaikan jarak dan intensitas dikunci sementara. Sesi kualitas berikutnya dialihkan ke Easy Run atau run-walk terukur.'
      };
    }

    // 3. EVALUASI SR-03: DOMS / Pegal Otot Tinggi (CAUTION)
    const lastLog = recentLogs[0] || {};
    const isConsecutiveSoreness =
      muscleSoreness >= SAFETY_THRESHOLDS.SORENESS.CONSECUTIVE_THRESHOLD &&
      (lastLog.muscle_soreness || 0) >= SAFETY_THRESHOLDS.SORENESS.CONSECUTIVE_THRESHOLD;
    const isHighSoreness = muscleSoreness >= SAFETY_THRESHOLDS.SORENESS.HIGH_THRESHOLD;

    if (isHighSoreness || isConsecutiveSoreness) {
      return {
        state: SAFETY_THRESHOLDS.STATES.CAUTION,
        ruleId: 'SR-03',
        title: 'Status: CAUTION (Pegal Otot Terakumulasi)',
        reason: 'Pegal otot terakumulasi tinggi (DOMS). Volume latihan minggu depan ditahan dan volume strength dipangkas.',
        action: 'HOLD_VOLUME_INCREASE',
        advice: 'Tahan kenaikan volume. Prioritaskan hidrasi, tidur, dan peregangan aktif.'
      };
    }

    // 4. EVALUASI SR-04: Kurang Tidur & Kelelahan Sistemik (CAUTION)
    const sleepDeficit = sleepHours < SAFETY_THRESHOLDS.FATIGUE_SLEEP.MIN_SLEEP_HOURS;
    const rpeExceeded = (actualRpe - targetRpe) >= SAFETY_THRESHOLDS.FATIGUE_SLEEP.EXCESS_RPE_DELTA;
    const highFatigue = fatigueScore >= SAFETY_THRESHOLDS.FATIGUE_SLEEP.HIGH_FATIGUE_SCORE;

    if (sleepDeficit && (rpeExceeded || highFatigue)) {
      return {
        state: SAFETY_THRESHOLDS.STATES.CAUTION,
        ruleId: 'SR-04',
        title: 'Status: CAUTION (Kelelahan & Defisit Tidur)',
        reason: 'Defisit tidur disertai lonjakan RPE/kelelahan sistemik. Diusulkan Deload Week adaptif.',
        action: 'PROPOSE_DELOAD',
        advice: 'Kapasitas adaptasi saraf menurun akibat kurang tidur. Diusulkan penurunan beban sementara (Deload).'
      };
    }

    // 5. STATUS DEFAULT: NORMAL
    return {
      state: SAFETY_THRESHOLDS.STATES.NORMAL,
      ruleId: null,
      title: 'Status: NORMAL (Optimal)',
      reason: 'Tidak ada indikasi red flag atau akumulasi fatigue kritis. Beban aman untuk progres.',
      action: 'ALLOW_PROGRESSION',
      advice: 'Kondisi fisiologis optimal. Lanjutkan program latihan sesuai target pace dan intensitas.'
    };
  }
}
