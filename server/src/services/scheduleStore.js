// In-memory schedules store for single-user mode (PRD Bagian 5.3)
let schedules = [
  {
    id: 'sch-1',
    day_name: 'SELASA',
    scheduled_date: '2026-11-24',
    session_type: 'INTERVAL',
    title: 'Interval 5x800m',
    target_distance_km: 6.5,
    target_pace: '5:45 - 5:55 /km',
    target_rpe: '7-8 / 10',
    instructions: 'Pemanasan 10 menit + aktivasi glute. 5 repetisi 800m dengan recovery 90 detik jogging santai.',
    strength_addon: 'Glute bridge, single-leg calf raise, plank (2 set)',
    status: 'planned',
    badge: null
  },
  {
    id: 'sch-2',
    day_name: 'KAMIS',
    scheduled_date: '2026-11-26',
    session_type: 'EASY_RECOVERY',
    title: 'Easy Recovery Run',
    target_distance_km: 5.0,
    target_pace: '6:15 - 6:30 /km',
    target_rpe: '3-4 / 10',
    instructions: 'Lari santai dengan ritme percakapan (bisa mengobrol nyaman). Sisipkan jalan 60 dtk jika perlu.',
    strength_addon: null,
    status: 'planned',
    badge: null
  },
  {
    id: 'sch-3',
    day_name: 'SABTU',
    scheduled_date: '2026-11-28',
    session_type: 'STRENGTH_MOBILITY',
    title: 'Mobilitas & Core Strength',
    target_distance_km: 0,
    target_pace: '-',
    target_rpe: '5 / 10',
    instructions: '35 menit fokus penguatan pelvis, gluteus medius, dan stabilitas pergelangan kaki.',
    strength_addon: null,
    status: 'planned',
    badge: null
  },
  {
    id: 'sch-4',
    day_name: 'MINGGU',
    scheduled_date: '2026-11-30',
    session_type: 'LONG_RUN',
    title: 'Long Run Aerobik',
    target_distance_km: 10.0,
    target_pace: '6:10 - 6:25 /km',
    target_rpe: '5 / 10',
    instructions: 'Membangun kapasitas aerobik dasar. Jaga ritme rileks, bawa air/elektrolit.',
    strength_addon: null,
    status: 'planned',
    badge: null
  }
];

// Audit trail riwayat mutasi (PRD schedule_mutation_logs)
let mutationLogs = [];

export const ScheduleStore = {
  getAll() {
    return schedules;
  },

  findById(id) {
    return schedules.find(s => s.id === id);
  },

  findByDay(dayName) {
    const cleanDay = (dayName || '').toUpperCase();
    return schedules.find(s => s.day_name.toUpperCase().includes(cleanDay));
  },

  update(id, updates, reason = 'Penyesuaian oleh Pelatih/Atlet') {
    const idx = schedules.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const previous = { ...schedules[idx] };
    const targetStatus = updates.status || schedules[idx].status || 'modified';
    const targetBadge = updates.badge !== undefined 
      ? updates.badge 
      : (targetStatus === 'completed' ? 'Selesai' : 'Disesuaikan Pelatih');

    schedules[idx] = {
      ...schedules[idx],
      ...updates,
      status: targetStatus,
      badge: targetBadge
    };

    const logEntry = {
      id: `mut-${Date.now()}`,
      schedule_id: id,
      previous_values: previous,
      new_values: schedules[idx],
      reason,
      created_at: new Date().toISOString()
    };
    mutationLogs.unshift(logEntry);

    return { updated: schedules[idx], log: logEntry };
  },

  undo(mutationId) {
    const logIdx = mutationLogs.findIndex(m => m.id === mutationId);
    if (logIdx === -1) return null;

    const log = mutationLogs[logIdx];
    const scheduleIdx = schedules.findIndex(s => s.id === log.schedule_id);
    if (scheduleIdx !== -1) {
      schedules[scheduleIdx] = { ...log.previous_values };
    }
    mutationLogs.splice(logIdx, 1);
    return schedules[scheduleIdx];
  }
};
