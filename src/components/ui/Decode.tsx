import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789<>/_';
const DURATION_MS = 650;
const STEP_MS = 36;

/**
 * Text that "decodes" itself the first time it scrolls into view: random glyphs
 * settle into the real characters from left to right.
 *
 * Use it only in monospace text, where swapping characters cannot move the layout.
 * Screen readers get a static copy; the animation is skipped with reduced motion.
 */
export function Decode({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    // Rewrite the existing text node so React keeps owning it.
    const node = el?.firstChild;
    if (!el || !node || reduce === true || typeof IntersectionObserver === 'undefined') return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        let last = 0;
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / DURATION_MS);
          if (progress === 1 || now - last >= STEP_MS) {
            last = now;
            const settled = Math.floor(progress * text.length);
            let out = text.slice(0, settled);
            for (const char of text.slice(settled)) {
              out += char === ' ' ? char : (GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? char);
            }
            node.nodeValue = out;
          }
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
      node.nodeValue = text;
    };
  }, [text, reduce]);

  return (
    <>
      <span className="sr-only print:not-sr-only">{text}</span>
      <span ref={ref} aria-hidden="true" data-decode="" className="print:hidden">
        {text}
      </span>
    </>
  );
}
