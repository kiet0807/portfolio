import { m, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in seconds. */
  delay?: number;
  className?: string;
}

type Phase = 'initial' | 'hidden' | 'shown';

/**
 * Fade/slide-in on scroll, as progressive enhancement:
 * - The prerendered HTML is fully visible (works without JS, never delays LCP).
 * - After hydration only elements that are still BELOW the viewport get hidden,
 *   then animate in once when scrolled to. Elements already on screen never flash.
 * - With reduced motion nothing is ever hidden.
 * - `data-reveal` lets the print stylesheet force everything visible.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('initial');

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce === true || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setPhase('shown');
          io.disconnect();
        } else if (entry.boundingClientRect.top > 0) {
          setPhase((p) => (p === 'initial' ? 'hidden' : p));
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  const hidden = phase === 'hidden';

  return (
    <m.div
      ref={ref}
      data-reveal=""
      className={className}
      initial={false}
      animate={hidden ? { opacity: 0, y: 28 } : { opacity: 1, y: 0 }}
      transition={hidden ? { duration: 0 } : { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
