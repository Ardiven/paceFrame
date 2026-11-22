// DB Service Layer — Athlete Profile Management (PRD FR-01)
// Mendukung Multi-User: Victor, Teman, atau Pelari Lain

import { getPrismaClient } from './prismaClient.js';

let inMemoryProfiles = {
  'local-user': {
    id: 'local-user',
    full_name: 'Victor Thimothi',
    goal_stage1: 'Sub-30',
    goal_stage1_pace: '6:00',
    goal_stage2: 'Sub-25',
    pb_5k_sec: 1950,
    baseline_easy_pace: '6:30/km',
    baseline_weekly_km: 18,
    training_days: [0, 2, 4],
    strict_day_lock: true,
    parq_consent: true
  }
};

export const athleteProfileService = {
  /**
   * Mengambil semua profil atlet yang terdaftar
   */
  async listProfiles() {
    const db = await getPrismaClient();
    if (!db) {
      return Object.values(inMemoryProfiles);
    }

    try {
      const profiles = await db.athleteProfile.findMany({
        orderBy: { created_at: 'asc' }
      });
      if (profiles && profiles.length > 0) return profiles;
      return Object.values(inMemoryProfiles);
    } catch (err) {
      console.warn('[athleteProfileService.listProfiles] Fallback to memory:', err.message);
      return Object.values(inMemoryProfiles);
    }
  },

  /**
   * Mengambil profil atlet berdasarkan ID
   */
  async getProfile(athleteId = 'local-user') {
    const db = await getPrismaClient();
    const isVictor = athleteId === 'local-user' || athleteId === process.env.SINGLE_USER_ATHLETE_ID;
    if (!db) return inMemoryProfiles[athleteId] || (isVictor ? inMemoryProfiles['local-user'] : null);

    try {
      const profile = await db.athleteProfile.findUnique({
        where: { id: athleteId }
      });
      return profile || inMemoryProfiles[athleteId] || (isVictor ? inMemoryProfiles['local-user'] : null);
    } catch (err) {
      console.warn('[athleteProfileService.getProfile] Error, fallback:', err.message);
      return inMemoryProfiles[athleteId] || (isVictor ? inMemoryProfiles['local-user'] : null);
    }
  },

  /**
   * Simpan atau perbarui profil atlet
   */
  async upsertProfile(data, athleteId = 'local-user') {
    const targetId = data.id || athleteId || 'local-user';

    inMemoryProfiles[targetId] = {
      ...(inMemoryProfiles[targetId] || {}),
      ...data,
      id: targetId
    };

    const db = await getPrismaClient();
    if (!db) return inMemoryProfiles[targetId];

    try {
      const updated = await db.athleteProfile.upsert({
        where: { id: targetId },
        update: {
          full_name: data.full_name || inMemoryProfiles[targetId]?.full_name || 'Pelari',
          goal_stage1: data.goal_stage1,
          goal_stage1_pace: data.goal_stage1_pace,
          goal_stage2: data.goal_stage2,
          pb_5k_sec: data.pb_5k_sec ? Number(data.pb_5k_sec) : undefined,
          baseline_easy_pace: data.baseline_easy_pace,
          baseline_weekly_km: data.baseline_weekly_km ? Number(data.baseline_weekly_km) : undefined,
          training_days: data.training_days || undefined,
          strict_day_lock: data.strict_day_lock !== undefined ? Boolean(data.strict_day_lock) : undefined,
          parq_consent: data.parq_consent !== undefined ? Boolean(data.parq_consent) : undefined,
          parq_answered_at: data.parq_consent ? new Date() : undefined
        },
        create: {
          id: targetId,
          full_name: data.full_name || 'Pelari Baru',
          goal_stage1: data.goal_stage1 || 'Sub-30',
          goal_stage1_pace: data.goal_stage1_pace || '6:00',
          goal_stage2: data.goal_stage2 || 'Sub-25',
          pb_5k_sec: data.pb_5k_sec ? Number(data.pb_5k_sec) : 1950,
          baseline_easy_pace: data.baseline_easy_pace || '6:30/km',
          baseline_weekly_km: data.baseline_weekly_km ? Number(data.baseline_weekly_km) : 18,
          training_days: data.training_days || [0, 2, 4],
          strict_day_lock: data.strict_day_lock !== undefined ? Boolean(data.strict_day_lock) : true,
          parq_consent: data.parq_consent !== undefined ? Boolean(data.parq_consent) : true,
          parq_answered_at: new Date()
        }
      });
      return updated;
    } catch (err) {
      console.warn('[athleteProfileService.upsertProfile] Error, fallback:', err.message);
      return inMemoryProfiles[targetId];
    }
  }
};
