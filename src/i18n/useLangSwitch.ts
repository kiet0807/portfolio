import { useCallback, useLayoutEffect, useRef } from 'react';
import { useLang } from './useLang';
import type { Lang } from './types';
import { SECTION_IDS, TOP_ID } from '@/components/layout/sections';

interface Anchor {
  id: string;
  /** Distance from the section top to the viewport top before the switch. */
  top: number;
}

const ANCHOR_IDS: readonly string[] = [TOP_ID, ...SECTION_IDS];

/**
 * Switches language in place while keeping the reader where they were.
 * Vietnamese copy is usually longer, so sections above change height: we remember
 * how far the current section was from the top of the viewport and restore
 * exactly that offset after React has rendered the new language.
 */
export function useLangSwitch(): (next: Lang) => void {
  const { lang, setLang } = useLang();
  const anchor = useRef<Anchor | null>(null);

  const switchLang = useCallback(
    (next: Lang) => {
      let current: Anchor | null = null;
      for (const id of ANCHOR_IDS) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        // Last section whose top edge has passed the header area is the one being read.
        if (top !== undefined && top <= 120) current = { id, top };
      }
      anchor.current = current;
      setLang(next);
    },
    [setLang],
  );

  useLayoutEffect(() => {
    const saved = anchor.current;
    anchor.current = null;
    if (!saved) return;
    const el = document.getElementById(saved.id);
    if (!el) return;
    const delta = el.getBoundingClientRect().top - saved.top;
    if (Math.abs(delta) >= 1) window.scrollBy({ top: delta, behavior: 'instant' });
  }, [lang]);

  return switchLang;
}
