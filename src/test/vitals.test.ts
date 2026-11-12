import { describe, expect, it } from 'vitest';
import { createClsTracker, formatVital, rateVital, VITAL_SPECS, vitalRatio } from '@/lib/vitals';

const spec = (id: string) => {
  const found = VITAL_SPECS.find((s) => s.id === id);
  if (!found) throw new Error(`No spec for ${id}`);
  return found;
};

describe('web vitals helpers', () => {
  it('rates values against the published thresholds', () => {
    expect(rateVital(2500, spec('lcp'))).toBe('good');
    expect(rateVital(2501, spec('lcp'))).toBe('fair');
    expect(rateVital(4001, spec('lcp'))).toBe('poor');
    expect(rateVital(0.1, spec('cls'))).toBe('good');
    expect(rateVital(0.3, spec('cls'))).toBe('poor');
    expect(rateVital(900, spec('ttfb'))).toBe('fair');
  });

  it('formats each metric in its usual unit', () => {
    expect(formatVital(56.4, 'ttfb')).toBe('56 ms');
    expect(formatVital(480, 'fcp')).toBe('0.48 s');
    expect(formatVital(1634, 'lcp')).toBe('1.63 s');
    expect(formatVital(0, 'cls')).toBe('0.00');
    expect(formatVital(0.1234, 'cls')).toBe('0.12');
  });

  it('maps a value onto the 0..1 meter and clamps it', () => {
    expect(vitalRatio(0, spec('lcp'))).toBe(0);
    expect(vitalRatio(2000, spec('lcp'))).toBe(0.5);
    expect(vitalRatio(9000, spec('lcp'))).toBe(1);
  });
});

describe('CLS session windows', () => {
  const shift = (startTime: number, value: number, hadRecentInput = false) => ({
    startTime,
    value,
    hadRecentInput,
  });

  it('adds shifts that are less than a second apart', () => {
    const track = createClsTracker();
    expect(track([shift(100, 0.02), shift(600, 0.03)])).toBeCloseTo(0.05);
  });

  it('starts a new window after a 1s gap and reports the largest window', () => {
    const track = createClsTracker();
    expect(track([shift(100, 0.08), shift(2000, 0.02)])).toBeCloseTo(0.08);
    expect(track([shift(2500, 0.09)])).toBeCloseTo(0.11);
  });

  it('caps a window at 5 seconds', () => {
    const track = createClsTracker();
    const burst = Array.from({ length: 8 }, (_, i) => shift(i * 900, 0.01));
    // Shifts at 0..4500ms share a window (6 of them); the one at 5400ms starts a new one.
    expect(track(burst)).toBeCloseTo(0.06);
  });

  it('ignores shifts caused by user input', () => {
    const track = createClsTracker();
    expect(track([shift(100, 0.5, true)])).toBe(0);
  });
});
