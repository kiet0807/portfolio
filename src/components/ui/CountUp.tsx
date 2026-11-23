import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useLang } from '@/i18n/useLang';
import { localNumber } from '@/lib/number';

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

const DURATION_MS = 1400;

/**
 * Number that counts up the first time it scrolls into view.
 * The final value is what gets prerendered and what assistive technology reads;
 * the animation only rewrites a decorative copy, and is skipped with reduced motion.
 * A number already on screen when the page wakes up keeps its value: the visitor has
 * read it, and counting from zero then would look like it dropped.
 */
export function CountUp({ value, decimals = 0, prefix = '', suffix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  /** Counts once: switching the language afterwards only rewrites the number. */
  const played = useRef(false);
  const reduce = useReducedMotion();
  const { lang } = useLang();
  const finalText = localNumber(`${prefix}${value.toFixed(decimals)}${suffix}`, lang);

  useEffect(() => {
    const el = ref.current;
    // Rewrite the existing text node so React keeps owning it.
    const textNode = el?.firstChild;
    if (!el || !textNode) return;
    textNode.nodeValue = finalText;
    if (played.current || reduce === true || typeof IntersectionObserver === 'undefined') return;
    const box = el.getBoundingClientRect();
    if (box.bottom > 0 && box.top < window.innerHeight) {
      played.current = true;
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        played.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / DURATION_MS);
          const eased = 1 - (1 - progress) ** 3;
          textNode.nodeValue = localNumber(`${prefix}${(value * eased).toFixed(decimals)}${suffix}`, lang);
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      textNode.nodeValue = finalText;
    };
  }, [value, decimals, prefix, suffix, lang, finalText, reduce]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums print:hidden">
        {finalText}
      </span>
      {/* Also what gets printed: paper must never show a half-counted number. */}
      <span className="sr-only print:not-sr-only">{finalText}</span>
    </>
  );
}
