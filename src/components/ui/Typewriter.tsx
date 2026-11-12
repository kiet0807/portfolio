import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

interface TypewriterProps {
  /** Phrases typed one after another. The first one is what gets prerendered. */
  phrases: readonly string[];
  /** Read by assistive technology together with the full list of phrases. */
  label: string;
  className?: string;
}

const TYPE_MS = 55;
const DELETE_MS = 28;
const HOLD_MS = 2200;
const START_MS = 2600;

/**
 * Terminal-style line that types the phrases in a loop.
 * Progressive enhancement: the HTML already contains the first phrase, screen readers
 * get the whole list once, and the animation only rewrites a decorative text node
 * (no React re-renders). It rests while off screen, and never starts with reduced motion.
 */
export function Typewriter({ phrases, label, className }: TypewriterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const first = phrases[0] ?? '';

  useEffect(() => {
    const el = ref.current;
    const node = el?.firstChild;
    if (!el || !node) return;
    node.nodeValue = first;
    if (reduce === true || phrases.length < 2) return;

    let timer = 0;
    let index = 0;
    let length = first.length;
    let deleting = true;
    let onScreen = true;
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = entry?.isIntersecting ?? true;
          });
    io?.observe(el);

    const step = () => {
      let delay = 600;
      if (!document.hidden && onScreen) {
        const phrase = phrases[index] ?? '';
        if (deleting && length > 0) {
          length -= 1;
          delay = DELETE_MS;
        } else if (deleting) {
          deleting = false;
          index = (index + 1) % phrases.length;
          delay = 260;
        } else if (length < phrase.length) {
          length += 1;
          delay = TYPE_MS;
        } else {
          deleting = true;
          delay = HOLD_MS;
        }
        node.nodeValue = (phrases[index] ?? '').slice(0, length);
      }
      timer = window.setTimeout(step, delay);
    };
    timer = window.setTimeout(step, START_MS);

    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [phrases, first, reduce]);

  return (
    <p className={cn('font-mono text-sm sm:text-base', className)}>
      <span className="sr-only">
        {label}: {phrases.join(', ')}
      </span>
      <span aria-hidden="true" className="inline-flex min-h-6 items-center">
        <span className="mr-2 text-link">&gt;</span>
        <span ref={ref} data-typed="" className="whitespace-pre">
          {first}
        </span>
        <span className="ml-0.5 inline-block h-[1.1em] w-[0.55em] animate-blink bg-link" />
      </span>
    </p>
  );
}
