// Account Routes (PRD FR-07 & UU PDP Kepatuhan Privasi)
// Fitur: Export semua data atlet (JSON), Penghapusan akun & file secara tuntas

import { Router } from 'express';
import { athleteProfileService } from '../services/db/athleteProfileService.js';
import { scheduleService } from '../services/db/scheduleService.js';
import { workoutLogService } from '../services/db/workoutLogService.js';
import { safetyStateService } from '../services/db/safetyStateService.js';
import { getPrismaClient } from '../services/db/prismaClient.js';

const router = Router();

/**
 * GET /api/account/profile
 * Mengambil profil atlet saat ini
 */
router.get('/profile', async (req, res) => {
  try {
    const athleteId = req.user?.id;
    const profile = await athleteProfileService.getProfile(athleteId);
    res.json({
      status: 'success',
      profile: profile || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat profil: ' + err.message });
  }
});

/**
 * GET /api/account/export
 */
router.get('/export', async (req, res) => {
  try {
    const athleteId = req.user?.id;
    const profile = await athleteProfileService.getProfile(athleteId);
    const schedules = await scheduleService.getAll(athleteId);
    const logs = await workoutLogService.getRecentLogs(1000, athleteId);
    const safetyState = await safetyStateService.getCurrentState(athleteId);

    const exportPackage = {
      app: 'PaceFrame AI',
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      athlete_profile: profile,
      safety_state: safetyState,
      training_schedules: schedules,
      workout_logs: logs
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="PaceFrame_Data_Export.json"');
    res.json(exportPackage);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengekspor data: ' + err.message });
  }
});

/**
 * DELETE /api/account
 * Menghapus akun dan seluruh data terkait (Right to be Forgotten - UU PDP)
 */
router.delete('/', async (req, res) => {
  try {
    const athleteId = req.user?.id || process.env.SINGLE_USER_ATHLETE_ID || 'local-user';
    const db = await getPrismaClient();
    if (db) {
      await db.athleteProfile.deleteMany({
        where: { id: athleteId }
      });
    }

    res.json({
      status: 'success',
      message: 'Akun dan semua data latihan berhasil dihapus secara permanen.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus akun: ' + err.message });
  }
});

export default router;
