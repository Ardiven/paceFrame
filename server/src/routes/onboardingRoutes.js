// Onboarding Routes (PRD FR-01)
// Inisialisasi profil atlet, persetujuan PAR-Q, dan pembuatan jadwal adaptif perdana

import { Router } from 'express';
import { athleteProfileService } from '../services/db/athleteProfileService.js';
import { getPrismaClient } from '../services/db/prismaClient.js';
import { AIAdapter } from '../services/ai/aiAdapter.js';

const router = Router();

const DAY_NAMES = {
  0: 'MINGGU',
  1: 'SENIN',
  2: 'SELASA',
  3: 'RABU',
  4: 'KAMIS',
  5: 'JUMAT',
  6: 'SABTU'
};

/**
 * GET /api/onboarding/status
 * Memeriksa apakah user saat ini memerlukan pengisian data awal (onboarding)
 */
router.get('/status', async (req, res) => {
  try {
    const athleteId = req.user?.id || 'local-user';
    const isVictor = athleteId === 'local-user' || athleteId === process.env.SINGLE_USER_ATHLETE_ID;

    // Single-user Victor default sudah siap tanpa perlu onboarding ulang
    if (isVictor) {
      const profile = await athleteProfileService.getProfile('local-user');
      return res.json({
        status: 'success',
        needsOnboarding: false,
        profile
      });
    }

    const profile = await athleteProfileService.getProfile(athleteId);
    const needsOnboarding = !profile || !profile.parq_consent;

    res.json({
      status: 'success',
      needsOnboarding,
      profile: profile || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memeriksa status onboarding: ' + err.message });
  }
});

/**
 * POST /api/onboarding
 * Menyimpan data onboarding atlet baru dan menyusun rencana latihan adaptif perdana
 */
router.post('/', async (req, res) => {
  const {
    fullName,
    goalStage1 = '5K Sub-30',
    goalStage1Pace = '5:50 - 6:00 /km',
    goalStage2 = '5K Sub-25',
    pb5k = '33:00',
    baselineEasyPace = '6:45/km',
    baselineWeeklyKm = 16,
    trainingDays = [2, 4, 0], // Default: Selasa, Kamis, Minggu
    strictDayLock = true,
    parqConsent = true
  } = req.body;

  const athleteId = req.user?.id || 'local-user';

  if (!fullName) {
    return res.status(400).json({ error: 'Nama atlet wajib diisi.' });
  }

  // Parse estimasi PB dalam detik
  let pbSec = 1980; // 33:00 default
  if (pb5k && pb5k.includes(':')) {
    const parts = pb5k.split(':');
    pbSec = (parseInt(parts[0], 10) * 60) + (parseInt(parts[1] || '0', 10));
  }

  try {
    // 1. Simpan Profil Atlet
    const profile = await athleteProfileService.upsertProfile({
      id: athleteId,
      full_name: fullName,
      goal_stage1: goalStage1,
      goal_stage1_pace: goalStage1Pace,
      goal_stage2: goalStage2,
      pb_5k_sec: pbSec,
      baseline_easy_pace: baselineEasyPace,
      baseline_weekly_km: Number(baselineWeeklyKm),
      training_days: trainingDays,
      strict_day_lock: Boolean(strictDayLock),
      parq_consent: Boolean(parqConsent)
    }, athleteId);

    // 2. Buat Program Latihan Adaptif di Database
    let welcomeInsight = `Halo ${fullName}! AI Coach telah menyusun rencana latihan Minggu 1 untuk membantumu mencapai target ${goalStage1}. Fokus utama kita di fase adaptasi awal adalah membangun fondasi aerobik yang aman dan konsisten.`;

    const db = await getPrismaClient();
    if (db) {
      // Hapus plan lama jika ada
      await db.trainingPlan.deleteMany({
        where: { athlete_id: athleteId }
      });

      // Coba generate jadwal cerdas via Gemini AI
      let aiPlan = null;
      try {
        aiPlan = await AIAdapter.generatePlanWithAI({ athleteProfile: profile });
      } catch (aiErr) {
        console.warn('[Onboarding] AI generation warning, fallback to science template:', aiErr.message);
      }

      const planName = aiPlan?.planName || `Road to ${goalStage1}`;
      const phaseName = aiPlan?.phaseName || 'Fase 1: Fondasi Aerobik & Adaptasi (Mgg 1/12)';
      if (aiPlan?.coachWelcomeInsight) {
        welcomeInsight = aiPlan.coachWelcomeInsight;
      }

      const activePlan = await db.trainingPlan.create({
        data: {
          athlete_id: athleteId,
          name: planName,
          phase_number: 1,
          phase_name: phaseName,
          target_milestone: goalStage1,
          total_weeks: 12,
          is_active: true
        }
      });

      // 3. Susun jadwal Minggu 1
      const generatedSchedules = [];

      if (aiPlan?.schedules && aiPlan.schedules.length > 0) {
        for (const sch of aiPlan.schedules) {
          generatedSchedules.push({
            plan_id: activePlan.id,
            week_number: 1,
            day_name: sch.day_name,
            session_type: sch.session_type || 'EASY_RECOVERY',
            title: sch.title || 'Sesi Latihan',
            target_distance_km: Number(sch.target_distance_km) || 4.0,
            target_pace: sch.target_pace || goalStage1Pace,
            target_rpe: sch.target_rpe || '5 / 10',
            instructions: sch.instructions || 'Lari terukur sesuai instruksi pelatih.',
            strength_addon: sch.strength_addon || null,
            status: 'planned'
          });
        }
      } else {
        // Fallback template berbasis hari pilihan
        const sortedDays = [...trainingDays].sort((a, b) => a - b);
        const totalKm = Number(baselineWeeklyKm) || 16;
        const intervalDist = Math.max(3.5, Number((totalKm * 0.3).toFixed(1)));
        const easyDist = Math.max(3.0, Number((totalKm * 0.25).toFixed(1)));
        const longDist = Math.max(5.0, Number((totalKm * 0.45).toFixed(1)));

        const day1 = sortedDays[0] !== undefined ? sortedDays[0] : 2;
        generatedSchedules.push({
          plan_id: activePlan.id,
          week_number: 1,
          day_name: DAY_NAMES[day1] || 'SELASA',
          session_type: 'INTERVAL',
          title: `Interval Fondasi Pace ${goalStage1}`,
          target_distance_km: intervalDist,
          target_pace: goalStage1Pace,
          target_rpe: '7-8 / 10',
          instructions: `Pemanasan 10 menit + aktivasi otot kaki. Latihan repetisi kecepatan terkontrol untuk adaptasi ambang laktat.`,
          strength_addon: 'Glute bridge, single-leg calf raise, core plank (2 set)',
          status: 'planned'
        });

        const day2 = sortedDays[1] !== undefined ? sortedDays[1] : 4;
        generatedSchedules.push({
          plan_id: activePlan.id,
          week_number: 1,
          day_name: DAY_NAMES[day2] || 'KAMIS',
          session_type: 'EASY_RECOVERY',
          title: 'Easy Recovery Run',
          target_distance_km: easyDist,
          target_pace: baselineEasyPace,
          target_rpe: '3-4 / 10',
          instructions: `Lari santai dengan ritme percakapan nyaman (Zone 2). Sisipkan jalan 60 detik jika detak jantung melampaui zona nyaman.`,
          strength_addon: null,
          status: 'planned'
        });

        const day3 = sortedDays[2] !== undefined ? sortedDays[2] : 0;
        generatedSchedules.push({
          plan_id: activePlan.id,
          week_number: 1,
          day_name: DAY_NAMES[day3] || 'MINGGU',
          session_type: 'LONG_RUN',
          title: 'Long Run Aerobik',
          target_distance_km: longDist,
          target_pace: baselineEasyPace,
          target_rpe: '5 / 10',
          instructions: `Membangun kapasitas aerobik dasar dan ketahanan otot. Pertahankan ritme rileks, bawa hidrasi cukup.`,
          strength_addon: null,
          status: 'planned'
        });

        if (sortedDays.length >= 4) {
          const day4 = sortedDays[3];
          generatedSchedules.push({
            plan_id: activePlan.id,
            week_number: 1,
            day_name: DAY_NAMES[day4] || 'SABTU',
            session_type: 'STRENGTH_MOBILITY',
            title: 'Mobilitas & Core Strength',
            target_distance_km: 0,
            target_pace: '-',
            target_rpe: '4-5 / 10',
            instructions: '30 menit latihan mobilitas panggul, pergelangan kaki, dan penguatan otot core untuk efisiensi biomekanik lari.',
            strength_addon: null,
            status: 'planned'
          });
        }
      }

      for (const sch of generatedSchedules) {
        await db.trainingSchedule.create({ data: sch });
      }
    }

    res.json({
      status: 'success',
      message: 'Onboarding berhasil diselesaikan',
      welcomeInsight,
      profile
    });
  } catch (err) {
    console.error('[Onboarding Error]:', err);
    res.status(500).json({ error: 'Gagal menyelesaikan onboarding: ' + err.message });
  }
});

export default router;
