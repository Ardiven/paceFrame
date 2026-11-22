// Mutation Routes (PRD FR-05)
// Kelola proposal penyesuaian jadwal (Assisted mutations): List, Approve, Reject, Undo

import { Router } from 'express';
import { scheduleService } from '../services/db/scheduleService.js';
import { MutationValidator } from '../services/mutationValidator.js';

const router = Router();

/**
 * GET /api/mutations/pending
 * Mengambil daftar usulan mutasi yang belum diproses
 */
router.get('/pending', async (req, res) => {
  try {
    const mutations = await scheduleService.getPendingMutations();
    res.json({
      status: 'success',
      pendingMutations: mutations
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil daftar usulan mutasi: ' + err.message });
  }
});

/**
 * POST /api/mutations/:id/approve
 * Menyetujui usulan mutasi dan menerapkan perubahan pada jadwal
 */
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { updates, reason } = req.body;

  try {
    const targetSchedule = await scheduleService.findById(id);
    if (!targetSchedule) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    // Validasi
    const validation = MutationValidator.validate(targetSchedule, updates || {});
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await scheduleService.update(
      id,
      updates || {},
      reason || 'Disetujui oleh Atlet dari Coach Chat'
    );

    res.json({
      status: 'success',
      message: 'Penyesuaian jadwal berhasil disetujui dan diterapkan',
      schedule: result.updated,
      mutationLog: result.log,
      warnings: validation.warnings
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyetujui mutasi: ' + err.message });
  }
});

/**
 * POST /api/mutations/:id/reject
 * Menolak usulan mutasi
 */
router.post('/:id/reject', (req, res) => {
  const { id } = req.params;
  res.json({
    status: 'success',
    message: `Usulan mutasi untuk jadwal ${id} ditolak.`
  });
});

/**
 * POST /api/mutations/:id/undo
 * Membatalkan mutasi dan mengembalikan ke nilai sebelumnya
 */
router.post('/:id/undo', async (req, res) => {
  const { id } = req.params;

  try {
    const restored = await scheduleService.undo(id);
    if (!restored) {
      return res.status(404).json({ error: 'Riwayat mutasi tidak ditemukan atau sudah dibatalkan' });
    }

    res.json({
      status: 'success',
      message: 'Jadwal berhasil dikembalikan ke versi sebelumnya',
      schedule: restored
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membatalkan mutasi: ' + err.message });
  }
});

export default router;
