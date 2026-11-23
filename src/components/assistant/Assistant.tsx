import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react';
import { BotFace } from '@/components/ui/BotFace';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';
import { VISITED_STORAGE_KEY } from '@/theme/theme-script';

// Downloaded the first time the bot is opened; never part of the initial bundle.
const AssistantPanel = lazy(() => import('./AssistantPanel'));

/** Where the first visit gets the long flight; narrower screens get a short pop (styles.css). */
const WIDE_FLIGHT = '(min-width: 1024px)';
/** Delay plus duration of the first-visit flight in styles.css, and a little slack. */
const FLIGHT_MS = 5300;
/** The same for the pop of narrow screens. */
const POP_MS = 2100;
/** How long Kai's greeting stays up after landing. */
const GREETING_MS = 7000;
/** Scrolling this far, or pressing anywhere else, puts the greeting away early. */
const GREETING_SCROLL_PX = 40;

/**
 * The guide bot in the bottom corner. On the first page view of a session its head comes
 * out of the hero's sphere, swoops across the page and lands in the ring, which waits here
 * the whole time (below 1024px, where the sphere sits under the text, it only pops up in
 * the ring): the flight is pure CSS, keyed on <html data-first-visit> (set before first
 * paint by the inline script in <head>), and this component only remembers that it happened.
 * Pressing the ring opens Kai's chat panel (ready-made questions, plus AI answers when the
 * chat function is configured); the panel follows the button in the document, so Tab moves
 * from one into the other.
 */
export function Assistant() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  /** The panel stays a moment after closing, to fade out the way it came in. */
  const [leaving, setLeaving] = useState(false);
  /** Kai says hello once, right after landing from the first-visit flight. */
  const [greeting, setGreeting] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute('data-first-visit')) return;
    try {
      sessionStorage.setItem(VISITED_STORAGE_KEY, '1');
    } catch {
      /* storage unavailable: the bot simply flies in again next time */
    }
    let goodbye = 0;
    const landed = window.setTimeout(
      () => {
        root.removeAttribute('data-first-visit');
        setGreeting(true);
        goodbye = window.setTimeout(() => setGreeting(false), GREETING_MS);
      },
      window.matchMedia(WIDE_FLIGHT).matches ? FLIGHT_MS : POP_MS,
    );
    return () => {
      window.clearTimeout(landed);
      window.clearTimeout(goodbye);
    };
  }, []);

  // The greeting covers part of the page on a phone: it goes as soon as the visitor moves on.
  useEffect(() => {
    if (!greeting) return;
    const startY = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > GREETING_SCROLL_PX) setGreeting(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !buttonRef.current?.contains(event.target)) setGreeting(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [greeting]);

  // Read by `close`, which keeps one identity so the open panel does not re-run its effects.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const close = useCallback((restoreFocus: boolean) => {
    if (openRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setLeaving(true);
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!leaving) return;
    // In case the animation never runs (a hidden tab): take the panel away anyway.
    const timer = window.setTimeout(() => setLeaving(false), 400);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return (
    <div data-assistant="" className="fixed right-4 bottom-10 z-40 print:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={t(open ? 'bot.close' : 'bot.open')}
        onClick={() => {
          setGreeting(false);
          if (open) {
            close(false);
          } else {
            setLeaving(false);
            setOpen(true);
          }
        }}
        className={cn(
          'group relative grid size-12 place-items-center rounded-full border bg-surface/80 shadow-glow-ai backdrop-blur-md transition-[border-color,transform] duration-300 ease-water hover:border-ai active:scale-95 sm:size-14',
          open ? 'border-ai' : 'border-ai/50',
        )}
      >
        {/*
          Kai's hello, shown once after the first-visit flight. It is part of the button, so
          pressing it opens the chat. Decorative for assistive technology: the button has a
          name, and the panel greets again. It stands on the button's bottom edge and grows
          upwards, so however many lines the greeting takes it stays clear of the status bar.
        */}
        <span
          aria-hidden="true"
          data-bot-greeting={greeting ? 'shown' : 'hidden'}
          className={cn(
            'absolute right-full bottom-0 mr-3 w-max max-w-[min(17rem,calc(100vw-6.5rem))] rounded-2xl rounded-br-md border border-ai/40 bg-surface/95 px-4 py-2.5 text-left text-sm font-medium text-pretty text-fg shadow-glow-ai backdrop-blur-md transition-[opacity,transform] duration-500 ease-water',
            greeting && !open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-2 opacity-0',
          )}
        >
          {t('bot.greeting').replace(/\{name\}/g, profile.givenName)}
        </span>
        {/* Name tag beside the ring: slides out on hover and keyboard focus, wide screens only. */}
        {!open && !greeting ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-full mr-3 hidden translate-x-2 -translate-y-1/2 rounded-full border border-line bg-surface/90 px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-fg opacity-0 shadow-card backdrop-blur-md transition-[opacity,transform] duration-300 ease-water group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:block"
          >
            {t('bot.open')}
          </span>
        ) : null}
        {/* A slow ring around the button, like a radar sweep. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 animate-turn-slow rounded-full border border-dashed border-ai/40 forced-colors:hidden"
        />
        {/* Only the head flies. It ignores the pointer, so in flight it never blocks what is under it. */}
        <span className="bot-fly pointer-events-none block">
          <BotFace className="size-8 animate-float sm:size-10" />
        </span>
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full rounded-br-sm bg-primary text-[0.5rem] leading-none font-bold tracking-widest text-white"
        >
          ···
        </span>
      </button>
      {open || leaving ? (
        <Suspense fallback={null}>
          <AssistantPanel id={panelId} onClose={close} leaving={!open} onLeft={() => setLeaving(false)} />
        </Suspense>
      ) : null}
    </div>
  );
}
