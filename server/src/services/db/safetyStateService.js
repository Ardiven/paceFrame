// DB Service Layer — Safety State Management
// Falls back to in-memory store if Supabase/Prisma not configured

import { getPrismaClient } from './prismaClient.js';

let inMemorySafetyState = {
  state: 'NORMAL',
  ruleId: null,
  title: 'Status: NORMAL (Optimal)',
  reason: 'Kondisi fisiologis optimal. Beban latihan aman untuk progres.',
  advice: 'Pertahankan disiplin hidrasi dan pola istirahat.'
};

// Per-user in-memory cache (untuk multi-user fallback)
const inMemoryPerUser = {};

const SINGLE_USER_ATHLETE_ID = process.env.SINGLE_USER_ATHLETE_ID || 'local-user';

export const safetyStateService = {
  /**
   * @param {string} [athleteId] - ID atlet; fallback ke SINGLE_USER
   */
  async getCurrentState(athleteId) {
    const targetId = athleteId || SINGLE_USER_ATHLETE_ID;
    const db = await getPrismaClient();
    if (!db) return inMemoryPerUser[targetId] || inMemorySafetyState;

    try {
      const latest = await db.safetyState.findFirst({
        where: { athlete_id: targetId },
        orderBy: { created_at: 'desc' }
      });
      if (!latest) return inMemoryPerUser[targetId] || inMemorySafetyState;
      return {
        state: latest.state,
        ruleId: latest.rule_id,
        title: latest.title,
        reason: latest.reason,
        action: latest.action,
        advice: latest.advice
      };
    } catch (err) {
      console.warn('[safetyStateService.getCurrentState] Error, fallback:', err.message);
      return inMemoryPerUser[targetId] || inMemorySafetyState;
    }
  },

  /**
   * @param {object} newState
   * @param {string} [athleteId] - ID atlet; fallback ke SINGLE_USER
   */
  async updateState(newState, athleteId) {
    const targetId = athleteId || SINGLE_USER_ATHLETE_ID;

    // Update in-memory cache
    inMemoryPerUser[targetId] = {
      ...(inMemoryPerUser[targetId] || inMemorySafetyState),
      ...newState
    };
    // Update default fallback for single-user compat
    if (targetId === SINGLE_USER_ATHLETE_ID) {
      inMemorySafetyState = { ...inMemorySafetyState, ...newState };
    }

    const db = await getPrismaClient();
    if (!db) return inMemoryPerUser[targetId];

    // Validasi enum state
    const VALID_STATES = ['NORMAL', 'CAUTION', 'LOCKED', 'MEDICAL_HOLD', 'MODIFIED', 'STOP', 'EMERGENCY'];
    const safeState = VALID_STATES.includes(newState.state) ? newState.state : 'NORMAL';

    try {
      // Pastikan athlete_profile FK ada
      await db.athleteProfile.upsert({
        where: { id: targetId },
        update: {},
        create: {
          id: targetId,
          full_name: 'Pelari',
          parq_consent: true
        }
      });

      await db.safetyState.create({
        data: {
          athlete_id: targetId,
          state: safeState,
          rule_id: newState.ruleId || null,
          title: newState.title || null,
          reason: newState.reason || null,
          action: newState.action || null,
          advice: newState.advice || null
        }
      });
      return inMemoryPerUser[targetId];
    } catch (err) {
      console.warn('[safetyStateService.updateState] Error, fallback:', err.message);
      return inMemoryPerUser[targetId];
    }
  }
};
