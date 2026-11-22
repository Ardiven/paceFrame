import { Router } from 'express';
import { scheduleService } from '../services/db/scheduleService.js';

const router = Router();

// GET /api/schedules
router.get('/', async (req, res) => {
  try {
    const athleteId = req.user?.id;
    const schedules = await scheduleService.getAll(athleteId);
    const activePlan = schedules[0]?.plan;
    res.json({
      status: 'success',
      activePhase: activePlan?.phase_name || 'Fase 1: Fondasi Aerobik (Mgg 1/12)',
      targetMilestone: activePlan?.target_milestone || '5K Sub-30',
      phaseNumber: activePlan?.phase_number || 1,
      totalWeeks: activePlan?.total_weeks || 12,
      schedules
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat jadwal: ' + err.message });
  }
});

// PATCH /api/schedules/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, instructions, target_distance_km, target_pace, session_type, reason } = req.body;
  const athleteId = req.user?.id;

  try {
    const result = await scheduleService.update(id, {
      ...(status && { status }),
      ...(instructions && { instructions }),
      ...(target_distance_km !== undefined && { target_distance_km: Number(target_distance_km) }),
      ...(target_pace && { target_pace }),
      ...(session_type && { session_type })
    }, reason, athleteId);

    if (!result) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    res.json({
      status: 'success',
      schedule: result.updated,
      mutationLog: result.log
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui jadwal: ' + err.message });
  }
});

export default router;
