import test from 'node:test';
import assert from 'node:assert/strict';
import { SafetyEngine } from '../../services/safetyEngine.js';
import { SAFETY_THRESHOLDS } from '../../config/safetyThresholds.js';
import { ExtractionCheck } from '../../services/extractionCheck.js';

test('Skenario T1: Pengguna melaporkan nyeri dada saat lari', () => {
  const result = SafetyEngine.evaluate({
    chestPain: true,
    localizedPain: 2,
    muscleSoreness: 2,
  });

  assert.equal(result.state, SAFETY_THRESHOLDS.STATES.MEDICAL_HOLD);
  assert.equal(result.ruleId, 'SR-01');
  assert.equal(result.allowSubstitute, false);
});

test('Skenario T2: Nyeri tajam di lutut, skor 5', () => {
  const result = SafetyEngine.evaluate({
    sharpPain: true,
    painLocation: 'Lutut (Patella)',
    localizedPain: 5,
  });

  assert.equal(result.state, SAFETY_THRESHOLDS.STATES.MEDICAL_HOLD);
  assert.equal(result.ruleId, 'SR-01');
});

test('Skenario T3: Nyeri lokal pinggul 4, sesi dihentikan dini', () => {
  const result = SafetyEngine.evaluate({
    localizedPain: 4,
    painLocation: 'Pinggul',
    sessionStoppedEarly: true,
  });

  assert.equal(result.state, SAFETY_THRESHOLDS.STATES.LOCKED);
  assert.equal(result.ruleId, 'SR-02');
  assert.equal(result.downgradeSession, true);
});

test('Skenario T4: Pegal otot biasa 5 setelah strength, tidur cukup 7 jam', () => {
  const result = SafetyEngine.evaluate({
    muscleSoreness: 5,
    localizedPain: 0,
    sleepHours: 7,
    fatigueScore: 4,
  });

  assert.equal(result.state, SAFETY_THRESHOLDS.STATES.NORMAL);
});

test('Skenario T5: Tidur 5 jam dan RPE 3 poin di atas target', () => {
  const result = SafetyEngine.evaluate({
    sleepHours: 5,
    targetRpe: 5,
    actualRpe: 8, // delta = 3 >= 2
  });

  assert.equal(result.state, SAFETY_THRESHOLDS.STATES.CAUTION);
  assert.equal(result.ruleId, 'SR-04');
});

test('Skenario T9: Deteksi selisih kalkulasi pace lebih dari 2%', () => {
  // Jarak 5km, durasi 1500 detik (25:00) -> pace harusnya 300 dtk/km (5:00/km)
  // AI melaporkan pace 320 dtk/km (5:20/km) -> selisih ~6.6%
  const check = ExtractionCheck.verify({
    distanceKm: 5.0,
    durationSec: 1500,
    aiReportedPaceSecKm: 320,
  });

  assert.equal(check.hasDiscrepancy, true);
  assert.ok(check.discrepancyPct > 2.0);
  assert.equal(check.recomputedPaceSecKm, 300);
  assert.equal(check.formattedPace, '5:00');
});
