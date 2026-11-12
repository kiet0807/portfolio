import { useCallback, useSyncExternalStore } from 'react';

const formatters = new Map<string, Intl.DateTimeFormat | null>();

function formatterFor(timeZone: string): Intl.DateTimeFormat | null {
  if (!formatters.has(timeZone)) {
    try {
      formatters.set(
        timeZone,
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone,
          timeZoneName: 'shortOffset',
        }),
      );
    } catch {
      // Unknown time zone name in profile.ts: show nothing rather than crash.
      formatters.set(timeZone, null);
    }
  }
  return formatters.get(timeZone) ?? null;
}

function subscribe(onTick: () => void): () => void {
  const id = window.setInterval(onTick, 10_000);
  return () => {
    window.clearInterval(id);
  };
}

/**
 * Current wall-clock time in `timeZone`, e.g. "14:32 GMT+7". Null on the server and
 * during hydration (the prerendered HTML cannot know the time), then updates by itself.
 */
export function useClock(timeZone: string): string | null {
  const getSnapshot = useCallback(() => formatterFor(timeZone)?.format(new Date()) ?? null, [timeZone]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
