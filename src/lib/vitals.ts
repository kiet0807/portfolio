/** Web Vitals read live in the visitor's browser (see useVitals). Pure helpers live here. */

export type VitalId = 'ttfb' | 'fcp' | 'lcp' | 'cls';
export type VitalRating = 'good' | 'fair' | 'poor';
export type Vitals = Readonly<Record<VitalId, number | null>>;

export interface VitalSpec {
  readonly id: VitalId;
  readonly name: string;
  /** Upper bound of "good" and lower bound of "poor", as published on web.dev. */
  readonly good: number;
  readonly poor: number;
}

/** Times are in milliseconds; CLS has no unit. */
export const VITAL_SPECS: readonly VitalSpec[] = [
  { id: 'ttfb', name: 'Time to First Byte', good: 800, poor: 1800 },
  { id: 'fcp', name: 'First Contentful Paint', good: 1800, poor: 3000 },
  { id: 'lcp', name: 'Largest Contentful Paint', good: 2500, poor: 4000 },
  { id: 'cls', name: 'Cumulative Layout Shift', good: 0.1, poor: 0.25 },
];

export function rateVital(value: number, spec: VitalSpec): VitalRating {
  if (value <= spec.good) return 'good';
  return value <= spec.poor ? 'fair' : 'poor';
}

export function formatVital(value: number, id: VitalId): string {
  if (id === 'cls') return value.toFixed(2);
  if (id === 'ttfb') return `${String(Math.round(value))} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

/** How far along the scale the value sits: 0 = instant, 1 = at or past the "poor" threshold. */
export function vitalRatio(value: number, spec: VitalSpec): number {
  return Math.min(1, Math.max(0, value / spec.poor));
}

export interface ShiftSample {
  readonly startTime: number;
  readonly value: number;
  readonly hadRecentInput: boolean;
}

/**
 * CLS as defined by Web Vitals: the largest "session window" of layout shifts
 * (shifts less than 1s apart, window capped at 5s). Shifts right after user input do not count.
 */
export function createClsTracker(): (samples: readonly ShiftSample[]) => number {
  let windowValue = 0;
  let windowStart = 0;
  let lastTime = 0;
  let max = 0;
  return (samples) => {
    for (const sample of samples) {
      if (sample.hadRecentInput) continue;
      const sameWindow =
        windowValue > 0 && sample.startTime - lastTime < 1000 && sample.startTime - windowStart < 5000;
      if (sameWindow) {
        windowValue += sample.value;
      } else {
        windowValue = sample.value;
        windowStart = sample.startTime;
      }
      lastTime = sample.startTime;
      max = Math.max(max, windowValue);
    }
    return max;
  };
}
