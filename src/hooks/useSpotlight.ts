import { useEffect } from 'react';

/**
 * Feeds the pointer position to whichever `[data-spotlight]` element is under the
 * cursor (as --spot-x / --spot-y), which the stylesheet turns into a soft light.
 * One delegated listener for the whole page; nothing re-renders.
 */
export function useSpotlight(): void {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    let latest: PointerEvent | null = null;

    const update = () => {
      frame = 0;
      if (!latest) return;
      const target =
        latest.target instanceof Element ? latest.target.closest<HTMLElement>('[data-spotlight]') : null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--spot-x', `${latest.clientX - rect.left}px`);
      target.style.setProperty('--spot-y', `${latest.clientY - rect.top}px`);
    };
    const onMove = (event: PointerEvent) => {
      latest = event;
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}
