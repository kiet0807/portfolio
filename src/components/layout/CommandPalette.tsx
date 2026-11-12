import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { SECTIONS, TOP_ID } from './sections';
import { profile } from '@/data/profile';
import type { DictKey } from '@/i18n/dictionary';
import type { Lang } from '@/i18n/types';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';
import { matchesQuery } from '@/lib/search';
import { setTheme, THEMES, useTheme, type Theme } from '@/theme/useTheme';

type GroupId = 'navigate' | 'actions' | 'links';

interface Command {
  id: string;
  group: GroupId;
  label: string;
  /** Short note on the right: a section number, a host name, a state. */
  hint?: string | undefined;
  /** Extra words the search should match. */
  keywords?: string;
  /** Leave the menu open after running (theme preview, copy confirmation). */
  keepOpen?: boolean;
  run: () => void;
}

const GROUP_LABEL: Record<GroupId, DictKey> = {
  navigate: 'palette.group.navigate',
  actions: 'palette.group.actions',
  links: 'palette.group.links',
};
const GROUP_ORDER: readonly GroupId[] = ['navigate', 'actions', 'links'];

const MODE_LABEL: Record<Theme, DictKey> = {
  light: 'theme.mode.light',
  dark: 'theme.mode.dark',
};

const pad = (n: number) => String(n).padStart(2, '0');

function goTo(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  window.history.pushState(null, '', `#${id}`);
  target.scrollIntoView();
}

function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function download(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = '';
  document.body.append(link);
  link.click();
  link.remove();
}

interface CommandPaletteProps {
  onClose: () => void;
  onSwitchLang: (next: Lang) => void;
}

/**
 * Command menu: jump to a section, change theme or language, copy the email,
 * open a link. A native modal <dialog> (focus trap, Esc and the inert page come
 * for free) holding a combobox + listbox, driven entirely from the keyboard.
 *
 * Default export so React.lazy can keep it out of the initial bundle: it is only
 * downloaded the first time someone opens it.
 */
export default function CommandPalette({ onClose, onSwitchLang }: CommandPaletteProps) {
  const { lang, t } = useLang();
  const { theme } = useTheme();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);
  const listId = useId();

  // Open as a modal on mount; give the focus back to whatever had it on unmount.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    if (dialog && !dialog.open) {
      // jsdom (unit tests) has no showModal(); a plain open dialog is enough there.
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    // showModal() focuses the first control, which is the search field; make sure of it.
    dialog?.querySelector('input')?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(onClose, 1100);
    return () => window.clearTimeout(timer);
  }, [copied, onClose]);

  const commands = useMemo<Command[]>(() => {
    const other: Lang = lang === 'en' ? 'vi' : 'en';
    return [
      { id: 'go-top', group: 'navigate', label: t('nav.home'), hint: '00', run: () => goTo(TOP_ID) },
      ...SECTIONS.map((section, i): Command => ({
        id: `go-${section.id}`,
        group: 'navigate',
        label: t(section.key),
        hint: pad(i + 1),
        keywords: section.id,
        run: () => goTo(section.id),
      })),
      ...THEMES.map((item): Command => ({
        id: `theme-${item}`,
        group: 'actions',
        label: `${t('theme.label')}: ${t(MODE_LABEL[item])}`,
        hint: item === theme ? '●' : undefined,
        keywords: `theme ${item}`,
        keepOpen: true,
        run: () => setTheme(item),
      })),
      {
        id: 'lang',
        group: 'actions',
        label: t('lang.switch'),
        hint: other.toUpperCase(),
        keywords: 'language english vietnamese tiếng việt tiếng anh ngôn ngữ',
        run: () => onSwitchLang(other),
      },
      {
        id: 'copy-email',
        group: 'actions',
        label: copied ? t('contact.copied') : t('contact.copy'),
        hint: profile.email,
        keywords: 'email mail',
        keepOpen: true,
        run: () => {
          void navigator.clipboard.writeText(profile.email).then(
            () => setCopied(true),
            () => undefined,
          );
        },
      },
      {
        id: 'cv',
        group: 'actions',
        label: t('contact.cv'),
        hint: 'PDF',
        keywords: 'cv resume download',
        run: () => download(profile.cv[lang]),
      },
      {
        id: 'print',
        group: 'actions',
        label: t('palette.print'),
        keywords: 'print pdf',
        run: () => window.print(),
      },
      {
        id: 'mail',
        group: 'links',
        label: t('contact.email'),
        hint: profile.email,
        keywords: 'email mail contact',
        run: () => window.location.assign(`mailto:${profile.email}`),
      },
      ...profile.socials.map((social): Command => ({
        id: `social-${social.id}`,
        group: 'links',
        label: social.label,
        hint: social.handle,
        run: () => openExternal(social.url),
      })),
      ...profile.projects.flatMap((project): Command[] => {
        const url = project.demoUrl;
        if (!url) return [];
        return [
          {
            id: `project-${project.id}`,
            group: 'links',
            label: project.name,
            hint: t('project.demo'),
            keywords: project.tech.join(' '),
            run: () => openExternal(url),
          },
        ];
      }),
    ];
  }, [copied, lang, theme, onSwitchLang, t]);

  const visible = useMemo(
    () =>
      GROUP_ORDER.flatMap((group) =>
        commands.filter(
          (command) =>
            command.group === group &&
            matchesQuery(query, `${command.label} ${command.keywords ?? ''} ${t(GROUP_LABEL[group])}`),
        ),
      ),
    [commands, query, t],
  );
  const active = Math.min(cursor, Math.max(0, visible.length - 1));
  const optionId = (command: Command) => `${listId}-${command.id}`;

  // Keep the highlighted option in view while moving with the arrow keys.
  useEffect(() => {
    const option = listRef.current?.querySelector('[aria-selected="true"]');
    if (option && typeof option.scrollIntoView === 'function') option.scrollIntoView({ block: 'nearest' });
  }, [active, query]);

  const close = () => {
    const dialog = dialogRef.current;
    // close() fires the dialog's "close" event, which calls onClose.
    if (dialog?.open && typeof dialog.close === 'function') dialog.close();
    else onClose();
  };

  const run = (command: Command) => {
    if (command.keepOpen) {
      command.run();
      return;
    }
    close();
    // After the dialog has closed and returned the focus, so neither gets in the way.
    window.setTimeout(command.run, 0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = visible.length - 1;
    const move = (next: number) => {
      event.preventDefault();
      setCursor(next);
    };
    if (event.key === 'ArrowDown') move(active >= last ? 0 : active + 1);
    else if (event.key === 'ArrowUp') move(active <= 0 ? last : active - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(last);
    else if (event.key === 'Enter') {
      event.preventDefault();
      const command = visible[active];
      if (command) run(command);
    }
  };

  // A click on the backdrop lands on the <dialog> element itself.
  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close();
  };

  const activeCommand = visible[active];

  return (
    <dialog
      ref={dialogRef}
      aria-label={t('palette.title')}
      className="palette"
      onClose={onClose}
      onClick={onDialogClick}
    >
      <div className="flex max-h-[inherit] flex-col overflow-hidden rounded-xl2 border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4 focus-within:border-link">
          <span aria-hidden="true" className="font-mono text-sm font-bold text-link">
            &gt;
          </span>
          <input
            type="text"
            role="combobox"
            aria-label={t('palette.placeholder')}
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeCommand ? optionId(activeCommand) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t('palette.placeholder')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            className="h-12 min-w-0 flex-1 bg-transparent font-mono text-sm text-fg outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={close}
            aria-label={t('nav.menu.close')}
            className="rounded-md border border-line px-1.5 py-0.5 font-mono text-xs text-muted transition-colors hover:border-link hover:text-link"
          >
            esc
          </button>
        </div>

        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t('palette.title')}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
        >
          {visible.flatMap((command, i) => {
            const selected = i === active;
            const option = (
              <li
                key={command.id}
                id={optionId(command)}
                role="option"
                aria-selected={selected}
                // Keep the focus in the input when an option is clicked.
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => setCursor(i)}
                onClick={() => run(command)}
                className={cn(
                  'flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-fg',
                  selected && 'bg-surface-2 shadow-[inset_2px_0_0_var(--link)]',
                )}
              >
                <span className="sr-only">{t(GROUP_LABEL[command.group])}: </span>
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                {command.hint ? (
                  <span className="max-w-[45%] shrink-0 truncate font-mono text-xs text-muted">
                    {command.hint}
                  </span>
                ) : null}
              </li>
            );
            if (visible[i - 1]?.group === command.group) return [option];
            return [
              <li
                key={`group-${command.group}`}
                role="presentation"
                aria-hidden="true"
                className={cn(
                  'px-3 pt-2 pb-1.5 text-xs font-medium tracking-wide text-muted uppercase',
                  i > 0 && 'mt-2',
                )}
              >
                {t(GROUP_LABEL[command.group])}
              </li>,
              option,
            ];
          })}
        </ul>
        {visible.length === 0 ? <p className="px-5 pb-6 text-sm text-muted">{t('palette.empty')}</p> : null}

        <p
          aria-hidden="true"
          className="flex items-center gap-4 border-t border-line px-4 py-2 font-mono text-xs text-muted"
        >
          <span>↑↓ {t('palette.hint.move')}</span>
          <span>↵ {t('palette.hint.select')}</span>
          <span>esc {t('palette.hint.close')}</span>
        </p>
        {/* Announces the result count, the empty state and the copy confirmation. */}
        <p role="status" className="sr-only">
          {copied ? t('contact.copied') : visible.length === 0 ? t('palette.empty') : String(visible.length)}
        </p>
      </div>
    </dialog>
  );
}
