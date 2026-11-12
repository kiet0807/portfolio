import { useSyncExternalStore } from 'react';
import { createClsTracker, type ShiftSample, type Vitals } from '@/lib/vitals';

const EMPTY: Vitals = { ttfb: null, fcp: null, lcp: null, cls: null };

/* One module-level store: the observers are created once, on first use, and never torn down. */
let current: Vitals = EMPTY;
let started = false;
const listeners = new Set<() => void>();

function update(patch: Partial<Vitals>): void {
  current = { ...current, ...patch };
  for (const listener of listeners) listener();
}

/** Subscribes to one performance entry type, including entries recorded before this call. */
function observe(type: string, onEntries: (entries: PerformanceEntryList) => void): boolean {
  try {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) return false;
    new PerformanceObserver((list) => {
      onEntries(list.getEntries());
    }).observe({ type, buffered: true });
    return true;
  } catch {
    return false;
  }
}

/** Time to first byte from the navigation entry (not available in every environment). */
function readTtfb(): number | null {
  const [navigation] = performance.getEntriesByType('navigation') as (
    PerformanceNavigationTiming | undefined
  )[];
  return navigation && navigation.responseStart > 0 ? navigation.responseStart : null;
}

function start(): void {
  if (started || typeof PerformanceObserver === 'undefined') return;
  started = true;
  // Telemetry is a nicety: whatever goes wrong here must never break the page.
  try {
    update({ ttfb: readTtfb() });
    observe('paint', (entries) => {
      const fcp = entries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcp) update({ fcp: fcp.startTime });
    });
    observe('largest-contentful-paint', (entries) => {
      const last = entries.at(-1);
      if (last) update({ lcp: last.startTime });
    });
    const trackCls = createClsTracker();
    const clsSupported = observe('layout-shift', (entries) => {
      update({ cls: trackCls(entries as unknown as ShiftSample[]) });
    });
    // No layout-shift entries at all means a perfect score, not "unknown".
    if (clsSupported) update({ cls: 0 });
  } catch {
    /* leave the remaining values as "not measured" */
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

/**
 * Core Web Vitals of the current page view, measured in this browser.
 * Values are null until known, and stay null where the browser lacks the API.
 */
export function useVitals(): Vitals {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => EMPTY,
  );
}
