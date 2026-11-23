import { useSyncExternalStore } from 'react';
import { safeStorage } from '@/lib/storage';
import { MOTION_STORAGE_KEY } from '@/theme/theme-script';

/*
 * "Pause motion": the page's own switch for everything that moves by itself for more than
 * five seconds (WCAG 2.2.2), for visitors who have not told their system to reduce motion.
 * The state lives on <html data-motion="paused">, set before first paint by the inline
 * script in <head> from the saved choice; CSS pauses the animations, and the few that run
 * in JavaScript (the typewriter, the 3D scene) read it through useMotionPaused().
 */

const EVENT = 'portfolio:motion';

export function isMotionPaused(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.motion === 'paused';
}

export function setMotionPaused(paused: boolean): void {
  const root = document.documentElement;
  if (paused) {
    root.dataset.motion = 'paused';
    safeStorage.set(MOTION_STORAGE_KEY, 'paused');
  } else {
    delete root.dataset.motion;
    safeStorage.remove(MOTION_STORAGE_KEY);
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** True while the visitor has paused motion. False on the server and during hydration. */
export function useMotionPaused(): boolean {
  return useSyncExternalStore(subscribe, isMotionPaused, () => false);
}
