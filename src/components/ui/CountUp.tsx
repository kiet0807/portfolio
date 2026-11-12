import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

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
 */
export function CountUp({ value, decimals = 0, prefix = '', suffix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const finalText = `${prefix}${value.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    // Rewrite the existing text node so React keeps owning it.
    const textNode = el?.firstChild;
    if (!el || !textNode || reduce === true || typeof IntersectionObserver === 'undefined') return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / DURATION_MS);
          const eased = 1 - (1 - progress) ** 3;
          textNode.nodeValue = `${prefix}${(value * eased).toFixed(decimals)}${suffix}`;
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
  }, [value, decimals, prefix, suffix, finalText, reduce]);

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
