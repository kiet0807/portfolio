import { useCallback, useId, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { MobileMenu } from './MobileMenu';
import { SECTIONS, TOP_ID } from './sections';
import { IconButton } from '@/components/ui/Button';
import { CloseIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from '@/components/ui/Icons';
import { profile } from '@/data/profile';
import { useShortcutLabel } from '@/hooks/usePlatform';
import { useScrolled } from '@/hooks/useScrolled';
import type { DictKey } from '@/i18n/dictionary';
import type { Lang } from '@/i18n/types';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';
import { useTheme, type Theme } from '@/theme/useTheme';

const MODE_LABEL: Record<Theme, DictKey> = {
  light: 'theme.mode.light',
  dark: 'theme.mode.dark',
};

interface HeaderProps {
  activeId: string | null;
  onSwitchLang: (next: Lang) => void;
  /** Opens the command menu. Without it the button is not rendered (404 page). */
  onOpenMenu?: () => void;
  /** Hide section links (used by the 404 page). */
  minimal?: boolean;
}

export function Header({ activeId, onSwitchLang, onOpenMenu, minimal = false }: HeaderProps) {
  const { lang, t } = useLang();
  const shortcut = useShortcutLabel();
  const { theme, next, toggle } = useTheme();
  const scrolled = useScrolled(8);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  const onToggleTheme = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  // One shared indicator slides under the active link. It is positioned by writing
  // styles directly (no state, no re-render) and re-measured when labels change width.
  useLayoutEffect(() => {
    const list = listRef.current;
    const bar = indicatorRef.current;
    if (!list || !bar) return;
    const place = () => {
      const link = activeId ? list.querySelector<HTMLElement>(`a[href="#${activeId}"]`) : null;
      if (!link) {
        bar.style.opacity = '0';
        return;
      }
      // The indicator lines up with the link text, so leave out the link's own padding.
      const inset = Number.parseFloat(getComputedStyle(link).paddingLeft) || 0;
      const width = Math.max(link.offsetWidth - inset * 2, 0);
      bar.style.opacity = '1';
      bar.style.transform = `translateX(${link.offsetLeft + inset}px) scaleX(${width})`;
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeId, lang]);

  const nextLang: Lang = lang === 'en' ? 'vi' : 'en';
  const solid = scrolled || open || minimal;
  const themeLabel = `${t('theme.label')}: ${t(MODE_LABEL[theme])}. ${t('theme.next')}: ${t(MODE_LABEL[next])}`;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 print:hidden',
        // Small screens: a solid bar. From md up the bar itself stays clear and the
        // navigation inside it turns into a floating glass pill (see below).
        solid
          ? 'border-line bg-bg/85 shadow-[0_8px_30px_-20px_rgb(2_6_23/0.6)] backdrop-blur-md md:border-transparent md:bg-transparent md:shadow-none md:backdrop-blur-none'
          : 'border-transparent bg-transparent',
      )}
    >
      {/* Reading progress, driven purely by CSS scroll-linked animation where supported. */}
      {!minimal ? <div aria-hidden="true" className="scroll-progress" /> : null}

      <nav
        aria-label={t('nav.primary')}
        data-pill={solid ? '' : undefined}
        className={cn(
          'container-x flex h-16 items-center justify-between gap-3 border border-transparent transition-[margin,height,background-color,border-color,box-shadow,border-radius] duration-500 ease-water',
          // The pill keeps a 0.75rem gap to the window, and gives the same amount back
          // as padding so the links do not move when it appears.
          solid &&
            'md:mt-3 md:h-14 md:w-[calc(100%-1.5rem)] md:rounded-full md:border-line md:bg-surface/70 md:px-3 md:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_16px_40px_-18px_rgb(2_6_23/0.75)] md:backdrop-blur-xl lg:px-5 xl:px-8',
        )}
      >
        <a
          href={minimal ? `/${lang}` : `#${TOP_ID}`}
          aria-label={minimal ? profile.name : t('nav.home')}
          className="flex min-w-0 items-center gap-2.5 font-display font-bold tracking-tight"
        >
          <img src="/favicon.svg" alt="" width={32} height={32} className="size-8 shrink-0" />
          {/* Hidden between md and lg, where the section links need the room (Vietnamese labels are longer). */}
          <span className="hidden whitespace-nowrap sm:inline md:hidden lg:inline">{profile.name}</span>
        </a>

        {!minimal ? (
          <div className="relative hidden md:block">
            <ul ref={listRef} className="flex items-center lg:gap-1">
              {SECTIONS.map((s) => {
                const active = activeId === s.id;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      aria-current={active ? 'location' : undefined}
                      className={cn(
                        'block rounded-full px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300 lg:px-3',
                        // In forced-colors mode the sliding indicator is invisible, so underline instead.
                        active
                          ? 'text-link forced-colors:underline forced-colors:decoration-2 forced-colors:underline-offset-8'
                          : 'text-muted hover:text-fg',
                      )}
                    >
                      {t(s.key)}
                    </a>
                  </li>
                );
              })}
            </ul>
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0.5 left-0 block h-0.5 w-px origin-left bg-link opacity-0 transition-[transform,opacity] duration-500 ease-water"
            />
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-2">
          {onOpenMenu ? (
            // Between md and lg the six section links need the room, so it steps aside there.
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label={t('nav.palette')}
              aria-keyshortcuts="Meta+K Control+K"
              title={t('nav.palette')}
              data-testid="command-menu"
              className="hidden h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3 text-muted transition-colors duration-300 hover:border-link hover:text-fg sm:inline-flex md:hidden lg:inline-flex"
            >
              <SearchIcon size={16} />
              <kbd aria-hidden="true" className="hidden font-mono text-xs xl:inline">
                {shortcut}
              </kbd>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onSwitchLang(nextLang)}
            aria-label={t('lang.switch')}
            className="inline-flex h-10 items-center rounded-full border border-line bg-surface p-1 text-xs font-bold transition-colors duration-300 hover:border-link"
          >
            {(['en', 'vi'] as const).map((code) => (
              <span
                key={code}
                aria-hidden="true"
                className={cn(
                  'rounded-full px-2.5 py-1.5 uppercase transition-colors duration-300',
                  // forced-colors: backgrounds are normally discarded, so opt this pill back in
                  // with system colours; otherwise the selected language cannot be told apart.
                  lang === code
                    ? 'bg-primary text-white forced-color-adjust-none forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]'
                    : 'text-muted',
                )}
              >
                {code}
              </span>
            ))}
          </button>

          <IconButton
            onClick={onToggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
            data-testid="theme-toggle"
          >
            {/* Both icons are rendered; CSS picks one from <html data-theme>, so nothing flashes on load. */}
            <SunIcon className="hidden light:block" />
            <MoonIcon className="hidden dark:block" />
          </IconButton>

          {!minimal ? (
            <IconButton
              ref={menuButtonRef}
              className="md:hidden"
              aria-label={open ? t('nav.menu.close') : t('nav.menu.open')}
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          ) : null}
        </div>
      </nav>

      {!minimal ? <MobileMenu id={menuId} open={open} activeId={activeId} onClose={closeMenu} /> : null}
    </header>
  );
}
