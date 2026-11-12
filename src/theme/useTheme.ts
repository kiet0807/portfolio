import { useCallback, useSyncExternalStore } from 'react';
import { THEME_COLOR, THEME_STORAGE_KEY } from './theme-script';
import { safeStorage } from '@/lib/storage';

/** Dark is the default; light only when the visitor asked for it. */
export type Theme = 'dark' | 'light';

export const THEMES: readonly Theme[] = ['dark', 'light'];

export function otherTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

/*
 * <html data-theme> is the single source of truth: the inline head script sets it
 * before paint, and React subscribes from here.
 */
const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function apply(theme: Theme): void {
  safeStorage.set(THEME_STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface RippleOrigin {
  x: number;
  y: number;
}

/**
 * Changes the theme and remembers the choice. When the colours actually change, the
 * View Transitions API is available and motion is allowed, the new theme spreads out
 * from `origin` like a ripple on water.
 */
export function setTheme(theme: Theme, origin?: RippleOrigin): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (theme === readTheme() || reduce || !('startViewTransition' in document)) {
    apply(theme);
    return;
  }
  const root = document.documentElement;
  root.style.setProperty('--ripple-x', origin ? `${origin.x}px` : '50%');
  root.style.setProperty('--ripple-y', origin ? `${origin.y}px` : '0%');
  document.startViewTransition(() => apply(theme));
}

export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => 'dark');
  const toggle = useCallback((origin?: RippleOrigin) => setTheme(otherTheme(readTheme()), origin), []);
  return { theme, next: otherTheme(theme), toggle } as const;
}
