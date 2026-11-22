import { GoogleGenAI } from '@google/genai';
import { AI_CONFIG } from '../../config/ai.js';
import { buildRunningCoachPrompt } from '../../prompts/runningCoach.js';
import { scheduleService } from '../db/scheduleService.js';

let genAIInstance = null;

function getAIClient() {
  if (!genAIInstance && AI_CONFIG.apiKey) {
    genAIInstance = new GoogleGenAI({ apiKey: AI_CONFIG.apiKey });
  }
  return genAIInstance;
}

/**
 * AI Adapter (PRD Bagian 3.2, 5.1, 6.3)
 * Satu pintu gerbang komunikasi dengan Google Gemini API.
 */
export class AIAdapter {
  static async executeWithFallback(taskFn) {
    const candidateModels = [
      AI_CONFIG.model || 'gemini-3.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.7-flash',
      'gemini-3.5-flash'
    ];

    let lastErr = null;
    for (const model of candidateModels) {
      try {
        return await taskFn(model);
      } catch (err) {
        lastErr = err;
        const msg = err.message || '';
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('404')) {
          console.warn(`[AI Adapter] Model ${model} terkendala (${msg.slice(0, 60)}...). Mencoba model cadangan...`);
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  /**
   * Ekstraksi cerdas telemetri lari dari tangkapan layar (Gemini Vision OCR)
   */
  static async extractWorkoutFromImage({ fileBuffer, mimeType = 'image/png' }) {
    const ai = getAIClient();
    if (!ai) throw new Error('Kunci API Gemini belum terhubung di server.');

    const prompt = `Kamu adalah OCR Telemetry Extractor untuk aplikasi lari PaceFrame AI.
Analisis gambar tangkapan layar aktivitas lari ini (Garmin Connect, Strava, Apple Fitness, Nike Run Club, Coros, Suunto, Polar, dll).
Ekstrak seluruh metrik lari yang tertera dan kembalikan HANYA format JSON valid tanpa tanda kutip pembungkus markdown:
{
  "distanceKm": 6.52,
  "durationSec": 2268,
  "durationFormatted": "37:48",
  "avgPace": "5:48",
  "avgHr": 162,
  "cadence": 172,
  "appSource": "Garmin Connect",
  "confidenceScore": 0.95
}
Ketentuan ekstraksi:
- distanceKm: angka float jarak dalam kilometer (misal 5.0 atau 6.52).
- durationSec: total waktu dalam detik (misal 30 menit = 1800 detik, 37 menit 48 detik = 2268).
- durationFormatted: string mm:ss atau hh:mm:ss.
- avgPace: string pace mm:ss (contoh "5:48", jangan sertakan "/km").
- avgHr: angka rata-rata detak jantung bpm jika ada, jika tidak tertera isi null.
- cadence: angka kadens (spm) jika ada, jika tidak tertera isi null.
- appSource: nama aplikasi atau smartwatch yang terdeteksi di gambar.
Jika suatu metrik tidak terlihat, berikan nilai null. Pastikan valid JSON.`;

    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.5-flash'];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType,
                data: fileBuffer.toString('base64')
              }
            },
            prompt
          ]
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.warn(`[extractWorkoutFromImage] Model ${model} gagal:`, err.message.slice(0, 70));
      }
    }

    throw new Error('Gagal mengekstrak data dari tangkapan layar melalui Gemini Vision.');
  }

  static async evaluateWorkout({
    workoutData,
    athleteProfile = {},
    recentLogs = [],
    safetyState = { state: 'NORMAL' }
  }) {
    const ai = getAIClient();
    if (!ai) return null;

    const systemPrompt = buildRunningCoachPrompt(athleteProfile);

    const userContent = `DATA SESI LATIHAN BARU:
- Jarak Aktual: ${workoutData.distanceKm} km
- Durasi: ${Math.floor(workoutData.durationSec / 60)} menit ${(workoutData.durationSec % 60)} detik
- Pace: ${workoutData.formattedPace}/km
- Detak Jantung Rata-rata: ${workoutData.avgHr || '-'} bpm
- Kadens: ${workoutData.cadence || '-'} spm
- RPE Aktual: ${workoutData.rpeScore} / 10
- Pegal Otot (DOMS): ${workoutData.muscleSoreness} / 10
- Nyeri Lokal: ${workoutData.localizedPain || 0} / 10 (Lokasi: ${workoutData.painLocation || 'Tidak ada'})
- Nyeri Tajam: ${workoutData.sharpPain ? 'YA' : 'TIDAK'}
- Hambatan Gerak: ${workoutData.functionalLimitation ? 'YA' : 'TIDAK'}
- Durasi Tidur: ${workoutData.sleepHours} Jam
- Status Safety Saat Ini: ${safetyState.state}
- Catatan Atlet: "${workoutData.notes || 'Tidak ada catatan'}"

Tolong berikan evaluasi 6 poin baku sport science (1. Ringkasan Fakta Objektif, 2. Kesesuaian Tujuan, 3. Hal Positif, 4. Masalah Pacing & Bio-Feedback, 5. Rekomendasi Sesi Berikutnya, 6. Implikasi Target Sub-30). Respons dalam format Markdown yang rapi dan terstruktur.`;

    return await this.executeWithFallback(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: userContent,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.4
        }
      });
      return response.text;
    });
  }

  static async chat({
    message,
    athleteProfile = {},
    safetyState = { state: 'NORMAL' },
    recentLogs = []
  }) {
    const ai = getAIClient();
    if (!ai) {
      return {
        replyMarkdown: 'Kunci API Gemini belum terhubung di server. Silakan hubungi admin.',
        proposedMutation: null
      };
    }

    const systemPrompt = buildRunningCoachPrompt(athleteProfile);
    const activeSchedules = await scheduleService.getAll();

    const contextPrefix = `[KONTEKS ATLET & JADWAL SAAT INI]
Status Safety: ${safetyState.state}
Target: 5K Sub-30 (Baseline PB: 32:30)
Jadwal Minggu Ini:
${activeSchedules.map(s => `- ${s.day_name}: ${s.title} (${s.target_distance_km} km @ ${s.target_pace})`).join('\n')}

Log Terakhir: ${recentLogs[0]?.actual_distance_km || 6.52} km @ pace ${recentLogs[0]?.avg_pace_sec_km ? Math.floor(recentLogs[0].avg_pace_sec_km / 60) + ':' + (recentLogs[0].avg_pace_sec_km % 60) : '5:48'}/km.

ATURAN PENTING:
Jika pesan atlet meminta atau menyepakati perubahan pada jadwal latihan (misal: "ubah jadwal Kamis jadi 4 km", "kurangi jarak", "ganti pace", "saya mau rest di hari X"), jawablah dengan ramah dan sertakan blok usulan mutasi terstruktur di baris paling akhir responsmu dengan format:
\`\`\`mutation
{
  "day_name": "KAMIS",
  "target_distance_km": 4.0,
  "target_pace": "6:30 - 6:45 /km",
  "instructions": "Penyesuaian jarak lari santai sesuai permintaan.",
  "reason": "Permintaan penyesuaian beban oleh atlet"
}
\`\`\`

Pertanyaan / Pesan Atlet: "${message}"`;

    const rawResponse = await this.executeWithFallback(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: contextPrefix,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5
        }
      });
      return response.text;
    });

    // Deteksi blok mutasi
    let proposedMutation = null;
    let cleanReply = rawResponse;

    const mutationMatch = rawResponse.match(/```mutation\s*([\s\S]*?)\s*```/);
    if (mutationMatch) {
      try {
        const parsed = JSON.parse(mutationMatch[1]);
        cleanReply = rawResponse.replace(/```mutation[\s\S]*?```/, '').trim();

        const targetSchedule = await scheduleService.findByDay(parsed.day_name);
        if (targetSchedule) {
          proposedMutation = {
            id: `prop-${Date.now()}`,
            schedule_id: targetSchedule.id,
            title: `Penyesuaian Sesi ${targetSchedule.day_name}`,
            reason: parsed.reason || 'Disesuaikan berdasarkan diskusi di chat',
            ruleId: 'SR-02',
            before: {
              session_type: targetSchedule.title,
              distance: `${targetSchedule.target_distance_km} km • Pace ${targetSchedule.target_pace}`
            },
            after: {
              session_type: parsed.session_type || targetSchedule.title,
              distance: `${parsed.target_distance_km ?? targetSchedule.target_distance_km} km • Pace ${parsed.target_pace || targetSchedule.target_pace}`
            },
            mutationData: {
              target_distance_km: parsed.target_distance_km ?? targetSchedule.target_distance_km,
              target_pace: parsed.target_pace || targetSchedule.target_pace,
              instructions: parsed.instructions || targetSchedule.instructions
            }
          };
        }
      } catch (err) {
        console.warn('[AI Adapter] Gagal mem-parse blok mutation:', err);
      }
    }

    return {
      replyMarkdown: cleanReply,
      proposedMutation
    };
  }

  /**
   * Pembuatan program latihan dan jadwal adaptif perdana berbasis Gemini AI (PRD FR-01)
   */
  static async generatePlanWithAI({ athleteProfile }) {
    const ai = getAIClient();
    if (!ai) return null;

    const daysMap = { 0: 'MINGGU', 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU' };
    const chosenDaysNames = (athleteProfile.training_days || [2, 4, 0]).map(d => daysMap[d] || 'SELASA');

    const prompt = `Kamu adalah Head Running Coach bersertifikasi Sport Science di PaceFrame AI.
Seorang pelari baru saja menyelesaikan registrasi dan mengisi data baseline berikut:
- Nama: ${athleteProfile.full_name}
- Target Utama: ${athleteProfile.goal_stage1} (Target Pace: ${athleteProfile.goal_stage1_pace})
- Target Lanjutan: ${athleteProfile.goal_stage2}
- Waktu Terbaik 5K (PB): ${athleteProfile.pb_5k_sec ? Math.floor(athleteProfile.pb_5k_sec / 60) + ':' + (athleteProfile.pb_5k_sec % 60).toString().padStart(2, '0') : 'Belum ada'}
- Pace Santai (Easy Pace): ${athleteProfile.baseline_easy_pace}
- Volume Mingguan Saat Ini: ${athleteProfile.baseline_weekly_km} km/minggu
- Hari Latihan Terpilih dalam Seminggu: ${chosenDaysNames.join(', ')}

Tugasmu:
Buatlah Rencana Latihan MINGGU 1 (Fase 1: Fondasi Aerobik & Adaptasi) yang dipersonalisasi khusus untuk pelari ini.
Aturan Sport Science:
1. Mulai benar-benar dari Minggu 1 (Fase 1: Fondasi Aerobik).
2. Jumlah sesi harus pas dengan hari yang dipilih: ${chosenDaysNames.join(', ')}.
3. Sesi pertama harus membangun kapasitas dasar (Easy Run / Interval Terkontrol), dan sesi akhir pekan adalah Long Run Aerobik yang terkontrol.
4. Total jarak latihan minggu 1 harus realistis sesuai volume dasar pelari (${athleteProfile.baseline_weekly_km} km) agar mematuhi aturan aman kenaikan beban 10% (SR-05).
5. Berikan pesan pembuka personal (coachWelcomeInsight) yang ramah, memotivasi, dan menjelaskan fokus Minggu 1.

Kembalikan HANYA format JSON valid tanpa tanda kutip pembungkus markdown:
{
  "planName": "Road to ${athleteProfile.goal_stage1}",
  "phaseName": "Fase 1: Fondasi Aerobik & Adaptasi (Mgg 1/12)",
  "phaseNumber": 1,
  "totalWeeks": 12,
  "coachWelcomeInsight": "Pesan selamat datang personal dari AI Coach...",
  "schedules": [
    {
      "day_name": "${chosenDaysNames[0]}",
      "session_type": "INTERVAL",
      "title": "Interval Pace Fondasi",
      "target_distance_km": 4.5,
      "target_pace": "${athleteProfile.goal_stage1_pace || '5:50 - 6:00 /km'}",
      "target_rpe": "7-8 / 10",
      "instructions": "Pemanasan 10 menit + aktivasi otot glute & betis...",
      "strength_addon": "Glute bridge, single-leg calf raise (2 set)"
    }
  ]
}`;

    try {
      const rawText = await this.executeWithFallback(async (model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.3
          }
        });
        return response.text;
      });

      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.warn('[AIAdapter.generatePlanWithAI] Terkendala, menggunakan fallback template:', err.message);
      return null;
    }
  }
}
