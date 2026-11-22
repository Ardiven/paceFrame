import { Router } from 'express';
import { SafetyEngine } from '../services/safetyEngine.js';
import { ExtractionCheck } from '../services/extractionCheck.js';
import { AIAdapter } from '../services/ai/aiAdapter.js';
import { workoutLogService } from '../services/db/workoutLogService.js';
import { safetyStateService } from '../services/db/safetyStateService.js';
import { athleteProfileService } from '../services/db/athleteProfileService.js';
import { scheduleService } from '../services/db/scheduleService.js';
import { upload, validateImageMagicBytes, uploadToSupabaseStorage } from '../middleware/uploadMiddleware.js';

const router = Router();

/**
 * GET /api/coach/logs/latest
 */
router.get('/logs/latest', async (req, res) => {
  try {
    const athleteId = req.user?.id;
    const logs = await workoutLogService.getRecentLogs(1, athleteId);
    const safetyState = await safetyStateService.getCurrentState(athleteId);
    res.json({
      status: 'success',
      latestLog: logs[0] || null,
      safetyState
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat log latihan: ' + err.message });
  }
});

/**
 * GET /api/coach/logs/all
 * Ambil semua log latihan untuk chart & analisis
 */
router.get('/logs/all', async (req, res) => {
  try {
    const athleteId = req.user?.id;
    const logs = await workoutLogService.getRecentLogs(100, athleteId);
    res.json({ status: 'success', logs });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat log: ' + err.message });
  }
});

/**
 * POST /api/coach/log-workout/extract
 * Endpoint verifikasi data ekstraksi OCR screenshot
 */
router.post('/log-workout/extract', upload.single('screenshot'), async (req, res) => {
  try {
    let fileBuffer = null;
    let fileName = req.body?.fileName || 'Workout_Screenshot.png';
    let mimeType = 'image/png';
    let storedImageUrl = null;

    if (req.file) {
      const isMagicValid = validateImageMagicBytes(req.file.buffer);
      if (!isMagicValid) {
        return res.status(400).json({ error: 'File gambar tidak valid atau rusak.' });
      }
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
      storedImageUrl = await uploadToSupabaseStorage(req.file.buffer, req.file.originalname);
    }

    let extractedData = {};
    if (fileBuffer) {
      extractedData = await AIAdapter.extractWorkoutFromImage({ fileBuffer, mimeType });
    } else if (req.body.distanceKm) {
      extractedData = {
        distanceKm: parseFloat(req.body.distanceKm),
        durationSec: parseInt(req.body.durationSec, 10),
        avgPace: req.body.aiReportedPaceSecKm ? `${Math.floor(req.body.aiReportedPaceSecKm / 60)}:${(req.body.aiReportedPaceSecKm % 60).toString().padStart(2, '0')}` : null,
        avgHr: req.body.avgHr ? parseInt(req.body.avgHr, 10) : null,
        cadence: req.body.cadence ? parseInt(req.body.cadence, 10) : null
      };
    }

    const dist = parseFloat(extractedData.distanceKm ?? req.body.distanceKm ?? 0);
    const dur = parseInt(extractedData.durationSec ?? req.body.durationSec ?? 0, 10);
    const reportedPaceSec = extractedData.avgPace ? ExtractionCheck.parsePaceToSec(extractedData.avgPace) : null;

    const verification = ExtractionCheck.verify({
      distanceKm: dist,
      durationSec: dur,
      aiReportedPaceSecKm: reportedPaceSec
    });

    res.json({
      status: 'success',
      fileName,
      imageUrl: storedImageUrl,
      extracted: extractedData,
      distanceKm: dist,
      durationSec: dur,
      avgHr: extractedData.avgHr || null,
      cadence: extractedData.cadence || null,
      recomputedPaceSecKm: verification.recomputedPaceSecKm,
      formattedPace: verification.formattedPace,
      hasDiscrepancy: verification.hasDiscrepancy,
      warning: verification.warning
    });
  } catch (err) {
    console.error('[OCR Extract Error]:', err);
    res.status(500).json({ error: 'Gagal mengekstrak data dari tangkapan layar: ' + err.message });
  }
});

/**
 * POST /api/coach/log-workout
 */
router.post('/log-workout', async (req, res) => {
  const {
    scheduleId,
    distanceKm,
    durationSec,
    cadence = 172,
    avgHr = 162,
    rpeScore = 7.5,
    muscleSoreness = 3,
    localizedPain = 0,
    painLocation = '',
    sharpPain = false,
    functionalLimitation = false,
    chestPain = false,
    dizziness = false,
    sessionStoppedEarly = false,
    fatigueScore = 4,
    sleepHours = 7.5,
    notes = '',
    screenshotUrl = null
  } = req.body;

  const athleteId = req.user?.id;

  try {
    const currentSafetyState = await safetyStateService.getCurrentState(athleteId);
    const recentLogs = await workoutLogService.getRecentLogs(5, athleteId);
    const athleteProfile = await athleteProfileService.getProfile(athleteId);

    const safetyResult = SafetyEngine.evaluate({
      muscleSoreness: Number(muscleSoreness),
      localizedPain: Number(localizedPain),
      painLocation,
      sharpPain: Boolean(sharpPain),
      functionalLimitation: Boolean(functionalLimitation),
      chestPain: Boolean(chestPain),
      dizziness: Boolean(dizziness),
      sessionStoppedEarly: Boolean(sessionStoppedEarly),
      fatigueScore: Number(fatigueScore),
      sleepHours: Number(sleepHours),
      rpeScore: Number(rpeScore),
      distanceKm: Number(distanceKm),
      durationSec: Number(durationSec),
      currentState: currentSafetyState.state,
      recentLogs
    });

    const updatedSafetyState = await safetyStateService.updateState({
      state: safetyResult.state,
      ruleId: safetyResult.ruleId,
      title: safetyResult.title,
      reason: safetyResult.reason,
      action: safetyResult.action,
      advice: safetyResult.advice
    }, athleteId);

    // Hitung pace
    const totalSec = Number(durationSec);
    const totalDist = Number(distanceKm);
    const secPerKm = totalDist > 0 ? Math.round(totalSec / totalDist) : 0;
    const paceMin = Math.floor(secPerKm / 60);
    const paceSec = (secPerKm % 60).toString().padStart(2, '0');
    const paceInfo = {
      secPerKm,
      formattedPace: `${paceMin}:${paceSec}`
    };

    // Evaluasi AI Coach
    let aiEvaluationMarkdown = null;
    try {
      aiEvaluationMarkdown = await AIAdapter.evaluateWorkout({
        workoutData: {
          distanceKm: Number(distanceKm),
          durationSec: Number(durationSec),
          formattedPace: paceInfo.formattedPace,
          avgHr: Number(avgHr),
          cadence: Number(cadence),
          rpeScore: Number(rpeScore),
          muscleSoreness: Number(muscleSoreness),
          localizedPain: Number(localizedPain),
          painLocation,
          sharpPain: Boolean(sharpPain),
          functionalLimitation: Boolean(functionalLimitation),
          sleepHours: Number(sleepHours),
          notes
        },
        athleteProfile,
        recentLogs,
        safetyState: updatedSafetyState
      });
    } catch (err) {
      console.warn('[AI Evaluation] Error:', err.message);
    }

    // Simpan ke DB
    const savedLog = await workoutLogService.createLog({
      scheduleId,
      actual_distance_km: Number(distanceKm),
      actual_duration_sec: Number(durationSec),
      avg_pace_sec_km: paceInfo.secPerKm,
      formatted_pace: paceInfo.formattedPace,
      avg_hr: Number(avgHr),
      cadence: Number(cadence),
      rpe_score: Number(rpeScore),
      muscle_soreness: Number(muscleSoreness),
      localized_pain: Number(localizedPain),
      pain_location: painLocation,
      sharp_pain: Boolean(sharpPain),
      functional_limitation: Boolean(functionalLimitation),
      chest_pain: Boolean(chestPain),
      dizziness: Boolean(dizziness),
      session_stopped_early: Boolean(sessionStoppedEarly),
      fatigue_score: Number(fatigueScore),
      sleep_hours: Number(sleepHours),
      notes,
      screenshot_paths: screenshotUrl ? [screenshotUrl] : [],
      ai_evaluation_md: aiEvaluationMarkdown,
      safety_state_at_log: updatedSafetyState.state
    }, athleteId);

    // Update status jadwal yang bersangkutan menjadi completed
    let targetSchId = scheduleId;
    if (!targetSchId) {
      try {
        const allSchedules = await scheduleService.getAll(athleteId);
        const pending = allSchedules.find(s => s.status !== 'completed');
        if (pending) targetSchId = pending.id;
      } catch (e) {
        console.warn('[log-workout] Tidak dapat menemukan jadwal aktif:', e.message);
      }
    }

    if (targetSchId) {
      try {
        await scheduleService.update(targetSchId, {
          status: 'completed',
          badge: 'Selesai'
        }, 'Sesi latihan berhasil diselesaikan & dicatat atlet', athleteId);
      } catch (schErr) {
        console.warn('[log-workout] Update schedule status warning:', schErr.message);
      }
    }

    res.json({
      status: 'success',
      log: savedLog,
      completedScheduleId: targetSchId,
      safetyState: updatedSafetyState,
      aiEvaluationMarkdown,
      advice: safetyResult.advice
    });
  } catch (err) {
    console.error('[log-workout error]:', err);
    res.status(500).json({ error: 'Gagal mencatat sesi: ' + err.message });
  }
});

/**
 * POST /api/coach/chat
 */
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  const athleteId = req.user?.id;

  try {
    const currentSafetyState = await safetyStateService.getCurrentState(athleteId);
    const athleteProfile = await athleteProfileService.getProfile(athleteId);
    const recentLogs = await workoutLogService.getRecentLogs(5, athleteId);

    const aiResult = await AIAdapter.chat({
      message,
      athleteProfile,
      safetyState: currentSafetyState,
      recentLogs
    });

    res.json({
      status: 'success',
      replyMarkdown: aiResult.replyMarkdown,
      proposedMutation: aiResult.proposedMutation,
      safetyState: currentSafetyState
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    const currentSafetyState = await safetyStateService.getCurrentState(athleteId);
    res.json({
      status: 'success',
      replyMarkdown: 'Maaf, terjadi kendala saat menghubungkan ke AI Coach. Tetap perhatikan sinyal pemulihan tubuh Anda.',
      proposedMutation: null,
      safetyState: currentSafetyState
    });
  }
});

export default router;
