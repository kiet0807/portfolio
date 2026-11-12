import { useSyncExternalStore } from 'react';

const subscribeNever = () => () => undefined;

function onApple(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * The command-menu shortcut as the visitor's keyboard labels it: "⌘K" on Apple
 * devices, "Ctrl K" elsewhere (which is also what gets prerendered).
 */
export function useShortcutLabel(): string {
  const apple = useSyncExternalStore(subscribeNever, onApple, () => false);
  return apple ? '⌘K' : 'Ctrl K';
}

function subscribeResize(onChange: () => void): () => void {
  window.addEventListener('resize', onChange, { passive: true });
  return () => window.removeEventListener('resize', onChange);
}

/** Window size as "1440×900". Null on the server and during hydration. */
export function useViewportSize(): string | null {
  return useSyncExternalStore(
    subscribeResize,
    () => `${window.innerWidth}×${window.innerHeight}`,
    () => null,
  );
}
