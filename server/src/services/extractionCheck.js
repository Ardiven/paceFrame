/**
 * Extraction Verification Service (PRD Bagian 3.2, 6.2, NFR 9.1)
 * Menghitung ulang pace dari durasi dan jarak aktual untuk memverifikasi ekstraksi AI.
 */
export class ExtractionCheck {
  /**
   * Menghitung pace rata-rata dalam detik/km dan format menit:detik/km.
   * @param {number} distanceKm - Jarak dalam km
   * @param {number} durationSec - Durasi total dalam detik
   * @returns {{ secPerKm: number, formattedPace: string }}
   */
  static computePace(distanceKm, durationSec) {
    if (!distanceKm || distanceKm <= 0 || !durationSec || durationSec <= 0) {
      return { secPerKm: 0, formattedPace: '0:00' };
    }
    const secPerKm = Math.round(durationSec / distanceKm);
    const minutes = Math.floor(secPerKm / 60);
    const seconds = Math.round(secPerKm % 60);
    const formattedPace = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return { secPerKm, formattedPace };
  }

  /**
   * Mengurai string pace "MM:SS" menjadi detik per km
   */
  static parsePaceToSec(paceStr) {
    if (!paceStr) return null;
    const clean = paceStr.replace(/[^0-9:]/g, '');
    const parts = clean.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return null;
  }

  /**
   * Memvalidasi hasil ekstraksi AI terhadap kalkulasi matematis objektif backend.
   * Toleransi toleransi maksimal: 2% (PRD Bagian 6.2).
   */
  static verify({ distanceKm, durationSec, aiReportedPaceSecKm }) {
    const { secPerKm, formattedPace } = this.computePace(distanceKm, durationSec);

    let hasDiscrepancy = false;
    let discrepancyPct = 0;

    if (aiReportedPaceSecKm && aiReportedPaceSecKm > 0 && secPerKm > 0) {
      const diff = Math.abs(aiReportedPaceSecKm - secPerKm);
      discrepancyPct = (diff / secPerKm) * 100;
      if (discrepancyPct > 2.0) {
        hasDiscrepancy = true;
      }
    }

    return {
      recomputedPaceSecKm: secPerKm,
      formattedPace,
      hasDiscrepancy,
      discrepancyPct: parseFloat(discrepancyPct.toFixed(2)),
      warning: hasDiscrepancy
        ? `Terdapat selisih ${discrepancyPct.toFixed(1)}% antara pace hasil tangkapan layar (${Math.floor(aiReportedPaceSecKm / 60)}:${(aiReportedPaceSecKm % 60).toString().padStart(2, '0')}) dan rasio jarak/durasi (${formattedPace}). Silakan periksa kembali.`
        : null
    };
  }
}
