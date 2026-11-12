import { Section } from './Section';
import { ArrowRightIcon, ArrowUpRightIcon } from '@/components/ui/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { ARTICLES, articlePath } from '@/content/articles';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';

interface Entry {
  id: string;
  kind: 'article' | 'talk';
  /** "YYYY-MM" */
  month: string;
  title: string;
  /** Lead line, shown for articles on this site. */
  summary?: string;
  venue: string;
  minutes: number;
  href: string;
  /** Published elsewhere: opens in a new tab. */
  external: boolean;
}

/**
 * Articles and talks, newest first, as a log inside one card. The whole row is the link
 * target. Articles on this site (src/content/articles.ts) open their own page; anything
 * published elsewhere (profile.writing) opens in a new tab.
 */
export function Writing() {
  const { lang, t } = useLang();
  const entries: Entry[] = [
    ...ARTICLES.map((article): Entry => ({
      id: article.slug,
      kind: 'article',
      month: article.date.slice(0, 7),
      title: article.title[lang],
      summary: article.summary[lang],
      venue: t('writing.onSite'),
      minutes: article.minutes[lang],
      href: articlePath(lang, article.slug),
      external: false,
    })),
    ...profile.writing.map((item): Entry => ({
      id: item.id,
      kind: item.kind,
      month: item.date,
      title: item.title[lang],
      venue: item.venue,
      minutes: item.minutes,
      href: item.url,
      external: true,
    })),
  ].sort((a, b) => b.month.localeCompare(a.month));

  return (
    // Not printed: on paper an article link is a bare path, and the CV PDF is the printable copy.
    <Section
      id="writing"
      kicker={t('section.writing.kicker')}
      title={t('section.writing')}
      className="print:hidden"
    >
      <Reveal>
        <div data-spotlight="" className="card px-6 py-3 print:border-0 print:p-0">
          <ul className="divide-y divide-line print:divide-y-0">
            {entries.map((item) => {
              const Arrow = item.external ? ArrowUpRightIcon : ArrowRightIcon;
              return (
                <li
                  key={item.id}
                  className="group relative -mx-3 grid grid-cols-[minmax(0,1fr)_1.25rem] gap-x-6 gap-y-1.5 px-3 py-4 transition-colors duration-300 hover:bg-surface-2/70 lg:grid-cols-[5rem_5.5rem_minmax(0,1fr)_13rem_1.25rem] lg:items-baseline print:mx-0 print:block print:p-0 print:pb-1.5"
                >
                  <p className="col-span-2 flex items-center gap-3 lg:contents">
                    <time dateTime={item.month} className="font-mono text-sm text-link">
                      {item.month.replace('-', '.')}
                    </time>
                    <span
                      className={cn(
                        'w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        item.kind === 'talk' ? 'border-link/50 text-link' : 'border-line text-muted',
                      )}
                    >
                      {t(item.kind === 'talk' ? 'writing.talk' : 'writing.article')}
                    </span>
                  </p>
                  <div className="min-w-0">
                    <a
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noreferrer noopener' : undefined}
                      data-print-url=""
                      data-writing-link=""
                      className="text-lg font-bold text-pretty underline-offset-4 group-hover:text-link after:absolute after:inset-0 hover:underline print:text-base print:after:static"
                    >
                      {item.title}
                      {item.external ? <span className="sr-only"> ({t('a11y.external')})</span> : null}
                    </a>
                    {item.summary ? (
                      <p className="mt-1.5 line-clamp-2 text-sm text-pretty text-muted print:hidden">
                        {item.summary}
                      </p>
                    ) : null}
                  </div>
                  <Arrow
                    size={16}
                    className="justify-self-end text-muted transition-transform duration-300 ease-water group-hover:translate-x-0.5 group-hover:text-link lg:col-start-5 lg:row-start-1 print:hidden"
                  />
                  <p className="col-span-2 text-sm text-muted lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:text-right">
                    {item.venue}
                    <span className="font-mono text-xs tabular-nums">
                      {' · '}
                      {item.minutes} {t('unit.minutes')}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>
    </Section>
  );
}
