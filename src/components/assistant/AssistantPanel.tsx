import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { BotFace } from '@/components/ui/BotFace';
import { ArrowRightIcon, CloseIcon } from '@/components/ui/Icons';
import { profile, topStack } from '@/data/profile';
import type { DictKey } from '@/i18n/dictionary';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';

/** The function behind the AI answers (api/chat.js). Same origin, so the CSP allows it. */
const CHAT_URL = '/api/chat';
/** Matches the limits enforced again on the server (server/chat.js). */
const MAX_CHARS = 400;
const MAX_TURNS = 10;

/**
 * Is the AI configured? Asked once per page view and remembered, so reopening the panel
 * costs nothing. A static host without the function simply answers "no".
 */
let availability: Promise<boolean> | null = null;
function aiAvailable(): Promise<boolean> {
  availability ??= fetch(CHAT_URL)
    .then((response) => (response.ok ? (response.json() as Promise<{ ai?: unknown }>) : null))
    .then((data) => data?.ai === true)
    .catch(() => false);
  return availability;
}

interface Topic {
  readonly id: string;
  readonly question: DictKey;
  readonly answer: DictKey;
  /** The section that holds the full answer. */
  readonly section: string;
}

/** Ready-made questions. They are answered in the browser, with or without the AI. */
const TOPICS: readonly Topic[] = [
  { id: 'role', question: 'bot.q.role', answer: 'bot.a.role', section: 'experience' },
  { id: 'stack', question: 'bot.q.stack', answer: 'bot.a.stack', section: 'skills' },
  { id: 'ai', question: 'bot.q.ai', answer: 'bot.a.ai', section: 'about' },
  { id: 'projects', question: 'bot.q.projects', answer: 'bot.a.projects', section: 'projects' },
  { id: 'contact', question: 'bot.q.contact', answer: 'bot.a.contact', section: 'contact' },
];

interface Entry {
  readonly id: number;
  readonly role: 'user' | 'bot';
  readonly text: string;
  /** Set on ready-made answers: the topic, and the section to send the visitor to. */
  readonly topic?: string;
  readonly section?: string;
  /** Set on answers written by the AI model. */
  readonly ai?: boolean;
}

/** Replaces {key} in a dictionary string. */
const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

interface AssistantPanelProps {
  id: string;
  /** `restoreFocus` is true when closed from the keyboard, so focus returns to the bot. */
  onClose: (restoreFocus: boolean) => void;
  /** Closed, and fading out: no longer the panel, nothing in it can be reached. */
  leaving?: boolean;
  /** Called when the fade-out has finished. */
  onLeft?: () => void;
}

/**
 * Kai's chat panel. Two ways to get an answer:
 *  - the question chips, answered at once from the dictionary and profile.ts;
 *  - a typed question, answered by the AI model behind /api/chat. The input only appears
 *    when that function reports that it is configured, and the note under it says where
 *    the question goes. When the function fails, the chips still work.
 * Default export so React.lazy can split it into its own chunk.
 */
export default function AssistantPanel({ id, onClose, leaving = false, onLeft }: AssistantPanelProps) {
  const { lang, t } = useLang();
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  /** null while the function is being asked whether the AI is configured. */
  const [ai, setAi] = useState<boolean | null>(null);
  const nextId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const firstQuestion = useRef<HTMLButtonElement>(null);
  const chipsRef = useRef<HTMLUListElement>(null);
  const request = useRef<AbortController | null>(null);
  /** Which sides of the row of questions still hide some: shows the arrow buttons. */
  const [more, setMore] = useState({ left: false, right: false });

  const values = useMemo(() => {
    const current = profile.experience[0];
    return {
      name: profile.givenName,
      title: profile.title[lang],
      company: current?.company ?? '',
      context: current?.context[lang] ?? '',
      stack: topStack(4).join(', '),
      projects: profile.projects.map((project) => project.name).join(', '),
      email: profile.email,
      ai: profile.ai.lead[lang],
    };
  }, [lang]);

  const add = useCallback((entry: Omit<Entry, 'id'>) => {
    nextId.current += 1;
    const id = nextId.current;
    setEntries((list) => [...list, { ...entry, id }]);
  }, []);

  useEffect(() => {
    let mounted = true;
    void aiAvailable().then((value) => {
      if (mounted) setAi(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    firstQuestion.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(true);
    };
    // The bot button lives in the same wrapper, so pressing it is not "outside".
    const onPointerDown = (event: PointerEvent) => {
      const wrapper = rootRef.current?.parentElement;
      if (wrapper && event.target instanceof Node && !wrapper.contains(event.target)) onClose(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
      request.current?.abort();
    };
  }, [onClose]);

  // The row of questions has no scrollbar, so a mouse gets three ways to reach the hidden
  // ones: the arrow buttons, dragging the row, and the wheel (which moves it sideways
  // instead of scrolling the page).
  useEffect(() => {
    const row = chipsRef.current;
    if (!row) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || row.scrollWidth <= row.clientWidth) return;
      event.preventDefault();
      row.scrollLeft += event.deltaY;
    };
    const measure = () => {
      const left = row.scrollLeft > 4;
      const right = row.scrollLeft + row.clientWidth < row.scrollWidth - 4;
      setMore((now) => (now.left === left && now.right === right ? now : { left, right }));
    };

    let pointer: number | null = null;
    let startX = 0;
    let startLeft = 0;
    let dragged = false;
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startLeft = row.scrollLeft;
      dragged = false;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const dx = event.clientX - startX;
      if (!dragged) {
        if (Math.abs(dx) < 5) return;
        dragged = true;
        row.setPointerCapture(event.pointerId);
        row.dataset.dragging = '';
      }
      row.scrollLeft = startLeft - dx;
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      delete row.dataset.dragging;
    };
    // The click that ends a drag must not ask a question.
    const onClick = (event: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    };

    measure();
    row.addEventListener('wheel', onWheel, { passive: false });
    row.addEventListener('scroll', measure, { passive: true });
    row.addEventListener('pointerdown', onDown);
    row.addEventListener('pointermove', onMove);
    row.addEventListener('pointerup', onUp);
    row.addEventListener('pointercancel', onUp);
    row.addEventListener('click', onClick, true);
    window.addEventListener('resize', measure);
    return () => {
      row.removeEventListener('wheel', onWheel);
      row.removeEventListener('scroll', measure);
      row.removeEventListener('pointerdown', onDown);
      row.removeEventListener('pointermove', onMove);
      row.removeEventListener('pointerup', onUp);
      row.removeEventListener('pointercancel', onUp);
      row.removeEventListener('click', onClick, true);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const scrollTopics = (direction: -1 | 1) => {
    const row = chipsRef.current;
    if (!row) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: direction * row.clientWidth * 0.7, behavior: calm ? 'auto' : 'smooth' });
  };

  // Keep the latest message in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries, pending]);

  const askTopic = (topic: Topic) => {
    add({ role: 'user', text: fill(t(topic.question), values) });
    add({ role: 'bot', text: fill(t(topic.answer), values), topic: topic.id, section: topic.section });
  };

  const send = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (question === '' || pending) return;
    const history = [...entries, { role: 'user' as const, text: question }]
      .slice(-MAX_TURNS)
      .map((entry) => ({ role: entry.role, text: entry.text.slice(0, MAX_CHARS) }));
    add({ role: 'user', text: question });
    setDraft('');
    setPending(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, messages: history }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as { reply?: unknown } | null;
      if (response.ok && typeof data?.reply === 'string' && data.reply !== '') {
        add({ role: 'bot', text: data.reply, ai: true });
      } else {
        add({ role: 'bot', text: fill(t(response.status === 429 ? 'bot.limit' : 'bot.error'), values) });
      }
    } catch {
      if (!controller.signal.aborted) add({ role: 'bot', text: fill(t('bot.error'), values) });
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  const bubble = 'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-pretty';
  const botBubble = `${bubble} rounded-tl-md border border-line bg-surface-2/70`;

  return (
    <div
      ref={rootRef}
      id={id}
      role="group"
      aria-label={t('bot.name')}
      data-assistant-panel={leaving ? undefined : ''}
      data-leaving={leaving ? '' : undefined}
      inert={leaving}
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) onLeft?.();
      }}
      data-ai={ai === null ? 'checking' : ai ? 'on' : 'off'}
      className="bot-panel absolute right-0 bottom-full mb-3 flex max-h-[min(36rem,calc(100dvh-8.5rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface/90 shadow-pop backdrop-blur-xl"
    >
      {/* A soft light in the top corner, as on a glass card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 size-56 rounded-full bg-ai/25 blur-3xl forced-colors:hidden"
      />

      <div className="relative flex items-center gap-3 border-b border-line px-4 py-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-ai/40 bg-surface-2 shadow-glow-ai">
          <BotFace className="size-8" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight font-bold">{t('bot.name')}</p>
          <p className="truncate label text-ai">{fill(t(ai ? 'bot.role.ai' : 'bot.role'), values)}</p>
        </div>
        <button
          type="button"
          onClick={() => onClose(true)}
          aria-label={t('bot.close')}
          className="ml-auto grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-link hover:text-fg"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        className="relative flex min-h-[min(16rem,30dvh)] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 text-sm"
      >
        <p className={botBubble}>{fill(t(ai ? 'bot.hello.ai' : 'bot.hello'), values)}</p>
        {entries.map((entry) =>
          entry.role === 'user' ? (
            <p key={entry.id} className={`${bubble} self-end rounded-tr-md bg-primary text-white`}>
              {entry.text}
            </p>
          ) : (
            <div
              key={entry.id}
              data-answer={entry.topic}
              data-reply={entry.ai ? '' : undefined}
              className={botBubble}
            >
              <p className="whitespace-pre-line">{entry.text}</p>
              {entry.section ? (
                <a
                  href={`#${entry.section}`}
                  onClick={() => onClose(false)}
                  className="mt-1.5 inline-flex min-h-8 items-center font-medium text-link underline-offset-4 hover:underline"
                >
                  {t('bot.goto')} →
                </a>
              ) : null}
            </div>
          ),
        )}
        {pending ? (
          <p data-thinking="" className={`${botBubble} flex items-center gap-1.5`}>
            <span className="sr-only">{t('bot.thinking')}</span>
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                aria-hidden="true"
                style={{ animationDelay: `${dot * 0.18}s` }}
                className="size-1.5 animate-pulse rounded-full bg-link"
              />
            ))}
          </p>
        ) : null}
      </div>

      <div className="relative border-t border-line px-4 pt-3 pb-3.5">
        {/*
          One scrolling row at every size, so the conversation keeps its room. The edges fade
          out and an arrow button appears on each side that still hides questions; the row can
          also be dragged with a mouse. The arrows are a pointer aid only: the keyboard reaches
          every question with Tab, so they stay out of the tab order and the accessibility tree.
        */}
        {(['left', 'right'] as const).map((side) =>
          more[side] ? (
            <button
              key={side}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              data-bot-topics-more={side}
              onClick={() => scrollTopics(side === 'left' ? -1 : 1)}
              className={cn(
                'absolute top-3.5 z-10 grid size-8 place-items-center rounded-full border border-line bg-surface text-muted shadow-md transition-colors duration-300 hover:border-link hover:text-link',
                side === 'left' ? 'left-2' : 'right-2',
              )}
            >
              <ArrowRightIcon size={14} className={side === 'left' ? 'rotate-180' : undefined} />
            </button>
          ) : null,
        )}
        <ul
          ref={chipsRef}
          data-bot-topics=""
          data-more-left={more.left ? '' : undefined}
          data-more-right={more.right ? '' : undefined}
          className="bot-topics -mx-4 flex cursor-grab [scrollbar-width:none] gap-2 overflow-x-auto px-4 pr-10 select-none data-dragging:cursor-grabbing"
        >
          {TOPICS.map((topic, i) => (
            <li key={topic.id} className="shrink-0">
              <button
                ref={i === 0 ? firstQuestion : undefined}
                type="button"
                data-topic={topic.id}
                onClick={() => askTopic(topic)}
                className="min-h-9 rounded-full border border-line bg-surface-2/70 px-3 py-1.5 text-left text-sm whitespace-nowrap transition-colors duration-300 hover:border-link"
              >
                {fill(t(topic.question), values)}
              </button>
            </li>
          ))}
        </ul>

        {ai ? (
          <form
            onSubmit={(event) => void send(event)}
            data-bot-form=""
            className="mt-3 flex items-center gap-2"
          >
            <label htmlFor={`${id}-input`} className="sr-only">
              {fill(t('bot.placeholder'), values)}
            </label>
            <input
              id={`${id}-input`}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_CHARS}
              autoComplete="off"
              enterKeyHint="send"
              placeholder={fill(t('bot.placeholder'), values)}
              // 16px text: smaller would make iOS zoom the page when the field is focused.
              className="h-11 min-w-0 flex-1 rounded-full border border-link/50 bg-bg/60 px-4 text-base shadow-[0_0_18px_-6px_var(--link)] transition-[border-color,box-shadow] duration-300 placeholder:text-muted focus:border-link focus:shadow-[0_0_22px_-4px_var(--link)]"
            />
            <button
              type="submit"
              disabled={pending || draft.trim() === ''}
              aria-label={t('bot.send')}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-transparent bg-primary text-white shadow-[0_8px_24px_-8px_rgb(37_99_235/0.7)] transition-[background-color,opacity,transform] duration-300 hover:bg-primary-hover active:scale-95 disabled:opacity-50"
            >
              <ArrowRightIcon size={18} />
            </button>
          </form>
        ) : null}

        <p data-bot-note="" className="mt-2.5 text-xs text-pretty text-muted">
          {t(ai ? 'bot.note.ai' : 'bot.note')}
        </p>
      </div>
    </div>
  );
}
