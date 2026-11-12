/** localStorage wrapper that never throws (private mode, blocked storage, SSR). */
export const safeStorage = {
  get(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const STORAGE_KEYS = {
  lang: 'portfolio:lang',
  theme: 'portfolio:theme',
} as const;
