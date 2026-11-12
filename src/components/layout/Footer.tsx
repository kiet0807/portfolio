import { TOP_ID } from './sections';
import { Vitals } from './Vitals';
import { ClockIcon, PinIcon } from '@/components/ui/Icons';
import { profile } from '@/data/profile';
import { useClock } from '@/hooks/useClock';
import { useLang } from '@/i18n/useLang';

/** What this site itself is made of. Shown as chips in the footer. */
const SITE_STACK = ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS 4', 'Motion', 'Three.js'] as const;

/** Set at build time by vite.config.ts; empty in tests and wherever it is not configured. */
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE ?? '';

export function Footer() {
  const { lang, t } = useLang();
  const clock = useClock(profile.timeZone);
  return (
    <footer className="relative isolate overflow-hidden border-t border-line print:hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 tech-grid fade-center forced-colors:hidden"
      />
      {/* The extra bottom padding keeps the last line clear of the fixed status bar and the guide bot. */}
      <div className="container-x pt-12 pb-28 sm:pt-14 sm:pb-32">
        <Vitals />

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.4fr_1fr]">
          <div>
            <p className="flex items-center gap-2.5 font-bold">
              <img src="/favicon.svg" alt="" width={28} height={28} className="size-7" />
              {profile.name}
            </p>
            <p className="mt-2 text-sm text-muted">{profile.title[lang]}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">{t('footer.stack')}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SITE_STACK.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-xs text-fg"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">{t('footer.localTime')}</p>
            <p className="mt-3 flex items-center gap-2 font-mono text-lg font-bold tabular-nums">
              <ClockIcon size={18} className="shrink-0 text-link" />
              {/* Unknown until the page runs in a browser; the placeholder keeps the width. */}
              <span data-clock="">{clock ?? '--:-- GMT'}</span>
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
              <PinIcon size={16} className="shrink-0" />
              {profile.location[lang]}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted">
            © {profile.name}. {t('footer.rights')}
            {BUILD_DATE ? (
              <span className="ml-3 font-mono text-xs whitespace-nowrap">
                {t('footer.build')} {BUILD_DATE}
              </span>
            ) : null}
          </p>
          <a
            href={`#${TOP_ID}`}
            className="inline-flex min-h-9 items-center text-sm font-medium text-link underline-offset-4 hover:underline"
          >
            {t('nav.home')} ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
