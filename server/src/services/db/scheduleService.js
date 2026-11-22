// DB Service Layer — Training Schedules
// Falls back to ScheduleStore (in-memory) if Supabase not configured

import { getPrismaClient } from './prismaClient.js';
import { ScheduleStore } from '../scheduleStore.js';

// Default athlete ID for single-user personal mode
const SINGLE_USER_ATHLETE_ID = process.env.SINGLE_USER_ATHLETE_ID || 'local-user';

/**
 * Seed initial baseline data if tables are empty in Supabase
 * @param {object} db - Prisma client
 * @param {string} [athleteId] - ID atlet target untuk seed
 */
async function ensureDefaultSeed(db, athleteId) {
  const targetId = athleteId || SINGLE_USER_ATHLETE_ID;
  const isVictor = targetId === SINGLE_USER_ATHLETE_ID;

  // Akun pengguna baru tidak boleh di-seed otomatis dengan data dummy Victor.
  // Pengguna baru wajib mengisi target & baseline sendiri via Onboarding.
  if (!isVictor) {
    return;
  }

  try {
    // 1. Pastikan Athlete Profile ada
    await db.athleteProfile.upsert({
      where: { id: targetId },
      update: {},
      create: {
        id: targetId,
        full_name: isVictor ? 'Victor Thimothi' : 'Pelari Baru',
        goal_stage1: 'Sub-30',
        goal_stage1_pace: '6:00',
        goal_stage2: 'Sub-25',
        pb_5k_sec: isVictor ? 1950 : 0,
        baseline_easy_pace: '6:30/km',
        baseline_weekly_km: isVictor ? 18 : 0,
        training_days: [0, 2, 4],
        strict_day_lock: true,
        parq_consent: true
      }
    });

    // 2. Pastikan Active Training Plan ada untuk athlete ini
    let plan = await db.trainingPlan.findFirst({
      where: { athlete_id: targetId, is_active: true }
    });

    if (!plan) {
      const planId = isVictor ? 'plan-default' : `plan-${targetId.substring(0, 8)}`;
      plan = await db.trainingPlan.create({
        data: {
          id: planId,
          athlete_id: targetId,
          name: 'Road to 5K Sub-30',
          phase_number: 2,
          phase_name: 'Fase 2: Build Kecepatan (Mgg 6/12)',
          target_milestone: '5K Sub-30',
          total_weeks: 12,
          is_active: true
        }
      });
    }

    // 3. Pastikan Schedules ada untuk plan ini
    const scheduleCount = await db.trainingSchedule.count({
      where: { plan_id: plan.id }
    });

    if (scheduleCount === 0) {
      const defaultSchedules = [
        {
          id: 'sch-1',
          plan_id: plan.id,
          day_name: 'SELASA',
          scheduled_date: new Date('2026-11-24'),
          session_type: 'INTERVAL',
          title: 'Interval 5x800m',
          target_distance_km: 6.5,
          target_pace: '5:45 - 5:55 /km',
          target_rpe: '7-8 / 10',
          instructions: 'Pemanasan 10 menit + aktivasi glute. 5 repetisi 800m dengan recovery 90 detik jogging santai.',
          strength_addon: 'Glute bridge, single-leg calf raise, plank (2 set)',
          status: 'planned'
        },
        {
          id: 'sch-2',
          plan_id: plan.id,
          day_name: 'KAMIS',
          scheduled_date: new Date('2026-11-26'),
          session_type: 'EASY_RECOVERY',
          title: 'Easy Recovery Run',
          target_distance_km: 5.0,
          target_pace: '6:15 - 6:30 /km',
          target_rpe: '3-4 / 10',
          instructions: 'Lari santai dengan ritme percakapan (bisa mengobrol nyaman). Sisipkan jalan 60 dtk jika perlu.',
          strength_addon: null,
          status: 'planned'
        },
        {
          id: 'sch-3',
          plan_id: plan.id,
          day_name: 'SABTU',
          scheduled_date: new Date('2026-11-28'),
          session_type: 'STRENGTH_MOBILITY',
          title: 'Mobilitas & Core Strength',
          target_distance_km: 0,
          target_pace: '-',
          target_rpe: '5 / 10',
          instructions: '35 menit fokus penguatan pelvis, gluteus medius, dan stabilitas pergelangan kaki.',
          strength_addon: null,
          status: 'planned'
        },
        {
          id: 'sch-4',
          plan_id: plan.id,
          day_name: 'MINGGU',
          scheduled_date: new Date('2026-11-30'),
          session_type: 'LONG_RUN',
          title: 'Long Run Aerobik',
          target_distance_km: 10.0,
          target_pace: '6:10 - 6:25 /km',
          target_rpe: '5 / 10',
          instructions: 'Membangun kapasitas aerobik dasar. Jaga ritme rileks, bawa air/elektrolit.',
          strength_addon: null,
          status: 'planned'
        }
      ];

      for (const sch of defaultSchedules) {
        await db.trainingSchedule.upsert({
          where: { id: sch.id },
          update: {},
          create: sch
        });
      }
    }
  } catch (err) {
    console.warn('[ensureDefaultSeed] Warning:', err.message);
  }
}

export const scheduleService = {
  /**
   * Get all schedules (from active plan)
   * @param {string} [athleteId]
   */
  async getAll(athleteId) {
    const targetId = athleteId || SINGLE_USER_ATHLETE_ID;
    const db = await getPrismaClient();
    if (!db) return ScheduleStore.getAll();

    try {
      await ensureDefaultSeed(db, targetId);
      const schedules = await db.trainingSchedule.findMany({
        where: {
          plan: {
            is_active: true,
            athlete_id: targetId,
          },
        },
        orderBy: { scheduled_date: 'asc' },
        include: { plan: true },
      });
      if (schedules && schedules.length > 0) {
        return schedules;
      }
      return targetId === SINGLE_USER_ATHLETE_ID ? ScheduleStore.getAll() : [];
    } catch (err) {
      console.error('[scheduleService.getAll] DB error, fallback:', err.message);
      return targetId === SINGLE_USER_ATHLETE_ID ? ScheduleStore.getAll() : [];
    }
  },

  /**
   * Find schedule by ID
   * @param {string} id
   * @param {string} [athleteId]
   */
  async findById(id, athleteId) {
    const targetId = athleteId || SINGLE_USER_ATHLETE_ID;
    const db = await getPrismaClient();
    if (!db) return ScheduleStore.findById(id);

    try {
      await ensureDefaultSeed(db, targetId);
      const schedule = await db.trainingSchedule.findUnique({ where: { id } });
      if (schedule) return schedule;
      return ScheduleStore.findById(id);
    } catch (err) {
      console.error('[scheduleService.findById] DB error, fallback:', err.message);
      return ScheduleStore.findById(id);
    }
  },

  /**
   * Find schedule by day name (e.g. "KAMIS")
   * @param {string} dayName
   * @param {string} [athleteId]
   */
  async findByDay(dayName, athleteId) {
    const targetId = athleteId || SINGLE_USER_ATHLETE_ID;
    const db = await getPrismaClient();
    if (!db) return ScheduleStore.findByDay(dayName);

    try {
      await ensureDefaultSeed(db, targetId);
      const cleanDay = (dayName || '').toUpperCase();
      const schedule = await db.trainingSchedule.findFirst({
        where: {
          day_name: { contains: cleanDay, mode: 'insensitive' },
          plan: { is_active: true, athlete_id: targetId },
        },
        orderBy: { scheduled_date: 'asc' },
      });
      if (schedule) return schedule;
      return ScheduleStore.findByDay(dayName);
    } catch (err) {
      console.error('[scheduleService.findByDay] DB error, fallback:', err.message);
      return ScheduleStore.findByDay(dayName);
    }
  },

  /**
   * Update a schedule + create mutation log
   * @param {string} id
   * @param {object} updates
   * @param {string} [reason]
   * @param {string} [athleteId]
   */
  async update(id, updates, reason = 'Penyesuaian oleh Pelatih/Atlet', athleteId) {
    const targetId = athleteId || SINGLE_USER_ATHLETE_ID;
    const db = await getPrismaClient();
    if (!db) return ScheduleStore.update(id, updates, reason);

    try {
      await ensureDefaultSeed(db, targetId);
      let previous = await db.trainingSchedule.findUnique({ where: { id } });
      if (!previous) {
        // Coba periksa apakah ID ada di in-memory store
        const memoryFallback = ScheduleStore.update(id, updates, reason);
        if (memoryFallback) return memoryFallback;
        return null;
      }

      const targetStatus = updates.status || 'modified';
      const targetBadge = updates.badge !== undefined 
        ? updates.badge 
        : (targetStatus === 'completed' ? 'Selesai' : 'Disesuaikan Pelatih');

      const updated = await db.trainingSchedule.update({
        where: { id },
        data: {
          ...updates,
          badge: targetBadge,
          status: targetStatus,
          updated_at: new Date(),
        },
      });

      let log = null;
      try {
        log = await db.scheduleMutationLog.create({
          data: {
            schedule_id: id,
            source: 'Assisted',
            previous_values: previous,
            new_values: updated,
            reason,
          },
        });
      } catch (logErr) {
        console.warn('[scheduleService.update] Log creation warning:', logErr.message);
      }

      // Selalu sinkronkan juga ke ScheduleStore agar cache in-memory konsisten
      ScheduleStore.update(id, updates, reason);

      return { updated, log };
    } catch (err) {
      console.error('[scheduleService.update] DB error, fallback:', err.message);
      return ScheduleStore.update(id, updates, reason);
    }
  },

  /**
   * Undo a mutation log entry
   */
  async undo(mutationId) {
    const db = await getPrismaClient();
    if (!db) return ScheduleStore.undo(mutationId);

    try {
      const log = await db.scheduleMutationLog.findUnique({ where: { id: mutationId } });
      if (!log) return ScheduleStore.undo(mutationId);

      const prev = log.previous_values;
      const restored = await db.trainingSchedule.update({
        where: { id: log.schedule_id },
        data: {
          target_distance_km: prev.target_distance_km,
          target_pace: prev.target_pace,
          instructions: prev.instructions,
          session_type: prev.session_type,
          badge: prev.badge || null,
          status: prev.status || 'planned',
          updated_at: new Date(),
        },
      });

      await db.scheduleMutationLog.update({
        where: { id: mutationId },
        data: { undone_at: new Date() },
      });

      ScheduleStore.undo(mutationId);

      return restored;
    } catch (err) {
      console.error('[scheduleService.undo] DB error, fallback:', err.message);
      return ScheduleStore.undo(mutationId);
    }
  },

  /**
   * Get all pending mutation logs (not yet approved/rejected/undone)
   */
  async getPendingMutations() {
    const db = await getPrismaClient();
    if (!db) return [];

    try {
      return await db.scheduleMutationLog.findMany({
        where: {
          approved_at: null,
          rejected_at: null,
          undone_at: null,
          source: 'Assisted',
        },
        orderBy: { created_at: 'desc' },
        include: { schedule: true },
      });
    } catch (err) {
      console.error('[scheduleService.getPendingMutations]:', err.message);
      return [];
    }
  },
};
