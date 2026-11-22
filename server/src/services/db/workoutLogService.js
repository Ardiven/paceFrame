// DB Service Layer — Workout Logs
// Falls back to in-memory store if Supabase/Prisma not configured

import { getPrismaClient } from './prismaClient.js';

let inMemoryLogs = [
  {
    id: 'log-prev-1',
    athlete_id: 'local-user',
    logged_date: '2026-11-20',
    actual_distance_km: 6.52,
    actual_duration_sec: 2268,
    avg_pace_sec_km: 348,
    formatted_pace: '5:48',
    avg_hr: 162,
    cadence: 172,
    rpe_score: 7.5,
    muscle_soreness: 3,
    localized_pain: 0,
    pain_location: '',
    sharp_pain: false,
    functional_limitation: false,
    chest_pain: false,
    dizziness: false,
    session_stopped_early: false,
    fatigue_score: 4,
    sleep_hours: 7.5,
    notes: 'Sesi interval 5x800m terasa cukup solid.'
  }
];

const SINGLE_USER_ATHLETE_ID = process.env.SINGLE_USER_ATHLETE_ID || 'local-user';

export const workoutLogService = {
  /**
   * @param {number} limit
   * @param {string} [athleteId] - ID atlet (dari req.user.id); fallback ke SINGLE_USER
   */
  async getRecentLogs(limit = 10, athleteId) {
    const targetId = athleteId || SINGLE_USER_ATHLETE_ID;
    const db = await getPrismaClient();
    if (!db) return inMemoryLogs.filter(l => l.athlete_id === targetId).slice(0, limit);

    try {
      return await db.workoutLog.findMany({
        where: { athlete_id: targetId },
        orderBy: { logged_date: 'desc' },
        take: limit,
        include: { schedule: true },
      });
    } catch (err) {
      console.warn('[workoutLogService.getRecentLogs] Error, fallback:', err.message);
      return inMemoryLogs.filter(l => l.athlete_id === targetId).slice(0, limit);
    }
  },

  /**
   * @param {object} logData
   * @param {string} [athleteId] - ID atlet (dari req.user.id); fallback ke SINGLE_USER
   */
  async createLog(logData, athleteId) {
    const targetId = athleteId || SINGLE_USER_ATHLETE_ID;
    const db = await getPrismaClient();
    const preparedData = {
      athlete_id: targetId,
      schedule_id: logData.scheduleId || null,
      actual_distance_km: Number(logData.actual_distance_km),
      actual_duration_sec: Number(logData.actual_duration_sec),
      avg_pace_sec_km: logData.avg_pace_sec_km ? Number(logData.avg_pace_sec_km) : null,
      formatted_pace: logData.formatted_pace || null,
      avg_hr: logData.avg_hr ? Number(logData.avg_hr) : null,
      cadence: logData.cadence ? Number(logData.cadence) : null,
      rpe_score: Number(logData.rpe_score),
      muscle_soreness: Number(logData.muscle_soreness || 0),
      localized_pain: Number(logData.localized_pain || 0),
      pain_location: logData.pain_location || null,
      sharp_pain: Boolean(logData.sharp_pain),
      functional_limitation: Boolean(logData.functional_limitation),
      chest_pain: Boolean(logData.chest_pain),
      dizziness: Boolean(logData.dizziness),
      session_stopped_early: Boolean(logData.session_stopped_early),
      fatigue_score: Number(logData.fatigue_score || 0),
      sleep_hours: logData.sleep_hours ? Number(logData.sleep_hours) : null,
      notes: logData.notes || null,
      screenshot_paths: logData.screenshot_paths || [],
      ai_evaluation_md: logData.ai_evaluation_md || null,
      safety_state_at_log: logData.safety_state_at_log || 'NORMAL'
    };

    if (!db) {
      const newEntry = {
        id: `log-${Date.now()}`,
        ...preparedData,
        created_at: new Date().toISOString()
      };
      inMemoryLogs.unshift(newEntry);
      return newEntry;
    }

    try {
      const created = await db.workoutLog.create({ 
        data: preparedData,
        include: { schedule: true }
      });
      inMemoryLogs.unshift(created);
      return created;
    } catch (err) {
      console.warn('[workoutLogService.createLog] Error, fallback to memory:', err.message);
      const newEntry = {
        id: `log-${Date.now()}`,
        ...preparedData,
        created_at: new Date().toISOString()
      };
      inMemoryLogs.unshift(newEntry);
      return newEntry;
    }
  }
};
