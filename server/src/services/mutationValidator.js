// Mutation Validator (PRD Bagian 3.2, 5.1)
// Memvalidasi usulan mutasi jadwal agar mematuhi aturan Sport Science & Safety

export const MutationValidator = {
  /**
   * Validasi usulan perubahan jadwal
   * @param {Object} currentSchedule - Sesi yang akan diubah
   * @param {Object} proposal - Perubahan yang diajukan
   * @param {Array} weeklySchedules - Semua jadwal minggu ini
   * @returns {{ isValid: boolean, error?: string, warnings?: string[] }}
   */
  validate(currentSchedule, proposal, weeklySchedules = []) {
    const warnings = [];

    // 1. Cek jarak tidak boleh negatif
    if (proposal.target_distance_km !== undefined) {
      const dist = Number(proposal.target_distance_km);
      if (isNaN(dist) || dist < 0) {
        return { isValid: false, error: 'Target jarak tidak boleh bernilai negatif.' };
      }
      if (dist > 42.2) {
        return { isValid: false, error: 'Target jarak melebihi batas wajar latihan harian (>42.2 km).' };
      }

      // Validasi lonjakan volume (>20% peningkatan mendadak)
      if (currentSchedule && currentSchedule.target_distance_km > 0) {
        const increaseRatio = (dist - currentSchedule.target_distance_km) / currentSchedule.target_distance_km;
        if (increaseRatio > 0.3) {
          warnings.push('Peringatan: Usulan menambah jarak sesi lebih dari 30% dari rencana awal. Pastikan tubuh cukup pulih.');
        }
      }
    }

    return {
      isValid: true,
      warnings
    };
  }
};
