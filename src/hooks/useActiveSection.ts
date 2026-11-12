import { useEffect, useState } from 'react';

/**
 * Tracks which section is "active" for nav highlighting. One IntersectionObserver
 * watches a band in the upper part of the viewport; the top-most section inside
 * that band wins.
 *
 * The hero (`topId`) and the footer are watched as well. Neither is a numbered
 * section, but without them a jump straight to either end of the page (Home/End,
 * "back to top" without smooth scrolling) changes nothing the observer can see,
 * and the previous section would stay highlighted.
 */
export function useActiveSection(ids: readonly string[], topId: string): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = ids.map((id) => document.getElementById(id)).filter((el) => el !== null);
    const top = document.getElementById(topId);
    const footer = document.querySelector('footer');
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        const first = sections.find((el) => visible.has(el));
        if (first) setActive(first.id);
        else if (top && visible.has(top)) setActive(null);
        else if (footer && visible.has(footer)) setActive(ids.at(-1) ?? null);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const el of [top, ...sections, footer]) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids, topId]);

  return active;
}
