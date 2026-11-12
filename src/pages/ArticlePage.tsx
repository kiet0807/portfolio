import { useMemo } from 'react';
import { Prose } from '@/components/article/Prose';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { TOP_ID } from '@/components/layout/sections';
import { SkipLink } from '@/components/layout/SkipLink';
import { ButtonLink } from '@/components/ui/Button';
import { ArrowRightIcon, DownloadIcon, MailIcon } from '@/components/ui/Icons';
import { Tag } from '@/components/ui/Tag';
import type { Article } from '@/content/articles';
import { profile } from '@/data/profile';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/date';

/** Article column and table-of-contents column; the header uses it too, so the title lines up with the text. */
const COLUMNS = 'mx-auto grid max-w-5xl gap-x-14 lg:grid-cols-[minmax(0,1fr)_13.5rem]';

interface TocEntry {
  id: string;
  text: string;
}

function TocList({ entries, activeId }: { entries: readonly TocEntry[]; activeId: string | null }) {
  return (
    <ol className="mt-3 space-y-1 border-l border-line">
      {entries.map((entry, i) => {
        const active = entry.id === activeId;
        return (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={active ? 'location' : undefined}
              className={cn(
                '-ml-px flex gap-2.5 border-l-2 py-1.5 pr-2 pl-3.5 text-sm leading-snug transition-colors duration-300',
                active
                  ? 'border-link text-fg forced-colors:underline'
                  : 'border-transparent text-muted hover:border-line hover:text-fg',
              )}
            >
              <span aria-hidden="true" className={cn('font-mono text-xs leading-5', active && 'text-link')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-pretty">{entry.text}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function ArticlePage({ article }: { article: Article }) {
  const { lang, setLang, t } = useLang();
  const { meta, blocks } = article;
  const toc = useMemo<TocEntry[]>(
    () =>
      blocks.flatMap((item) =>
        item.kind === 'heading' && item.level === 2 ? [{ id: item.id, text: item.text }] : [],
      ),
    [blocks],
  );
  const tocIds = useMemo(() => toc.map((entry) => entry.id), [toc]);
  const activeId = useActiveSection(tocIds, TOP_ID);
  useSpotlight();

  return (
    <>
      <SkipLink />
      <Header activeId={null} onSwitchLang={setLang} minimal progress />
      <main id="main" tabIndex={-1} className="relative isolate outline-none">
        <div aria-hidden="true" className="starfield print:hidden forced-colors:hidden" />
        <article aria-labelledby="article-title" data-article={meta.slug}>
          <header
            id={TOP_ID}
            className="relative isolate overflow-hidden pt-28 pb-10 sm:pt-36 sm:pb-14 print:pt-0"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 tech-grid fade-tr print:hidden forced-colors:hidden"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-56 -right-64 -z-10 section-glow print:hidden forced-colors:hidden"
            />
            <div className="container-x">
              <div className={COLUMNS}>
                <div className="min-w-0">
                  <nav aria-label={t('article.breadcrumb')} className="print:hidden">
                    <ol className="flex flex-wrap items-center gap-2 label text-muted">
                      <li>
                        <a href={`/${lang}`} className="transition-colors duration-300 hover:text-link">
                          {profile.name}
                        </a>
                      </li>
                      <li aria-hidden="true">/</li>
                      <li>
                        <a
                          href={`/${lang}#writing`}
                          className="transition-colors duration-300 hover:text-link"
                        >
                          {t('nav.writing')}
                        </a>
                      </li>
                    </ol>
                  </nav>

                  <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-medium tracking-wide text-link">
                    <span className="uppercase">{t('writing.article')}</span>
                    <span aria-hidden="true" className="h-px w-6 bg-link/60" />
                    <time dateTime={meta.date} className="font-mono text-fg">
                      {formatDate(meta.date, lang)}
                    </time>
                    <span aria-hidden="true" className="text-muted">
                      ·
                    </span>
                    <span className="font-mono text-muted">
                      {meta.minutes[lang]} {t('unit.minutes')} {t('article.read')}
                    </span>
                  </p>

                  <h1
                    id="article-title"
                    className="mt-5 text-4xl leading-[1.08] font-light tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]"
                  >
                    {meta.title[lang]}
                  </h1>
                  <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted sm:text-xl">
                    {meta.summary[lang]}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-line pt-6">
                    <a href={`/${lang}`} className="group flex items-center gap-3">
                      <img
                        src={profile.avatar.src}
                        alt=""
                        width={profile.avatar.width}
                        height={profile.avatar.height}
                        className="size-11 rounded-full border border-line object-cover"
                      />
                      <span className="leading-tight">
                        <span className="block font-bold transition-colors duration-300 group-hover:text-link">
                          {profile.name}
                        </span>
                        <span className="block text-sm text-muted">{profile.title[lang]}</span>
                      </span>
                    </a>
                    <ul aria-label={t('article.tags')} className="flex flex-wrap gap-2">
                      {meta.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="container-x pb-20 sm:pb-28">
            <div className={COLUMNS}>
              <div className="min-w-0">
                {toc.length > 0 ? (
                  <details className="group mb-10 card px-5 py-4 lg:hidden print:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 label text-muted [&::-webkit-details-marker]:hidden">
                      {t('article.toc')}
                      <ArrowRightIcon
                        size={14}
                        className="transition-transform duration-300 group-open:rotate-90"
                      />
                    </summary>
                    <TocList entries={toc} activeId={activeId} />
                  </details>
                ) : null}

                <Prose blocks={blocks} externalLabel={t('a11y.external')} />

                <aside
                  aria-labelledby="article-author"
                  data-spotlight=""
                  className="relative mt-16 overflow-hidden card p-6 sm:p-8 print:hidden"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 tech-dots fade-tl forced-colors:hidden"
                  />
                  <p id="article-author" className="label text-link">
                    {t('article.author')}
                  </p>
                  <div className="mt-4 flex items-start gap-4">
                    <img
                      src={profile.avatar.src}
                      alt=""
                      width={profile.avatar.width}
                      height={profile.avatar.height}
                      className="size-16 shrink-0 rounded-2xl border border-line object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xl font-bold">{profile.name}</p>
                      <p className="text-sm text-muted">{profile.title[lang]}</p>
                      <p className="mt-3 text-pretty">{profile.tagline[lang]}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <ButtonLink href={`/${lang}`}>
                      {t('article.portfolio')}
                      <ArrowRightIcon size={16} />
                    </ButtonLink>
                    <ButtonLink href={profile.cv[lang]} download variant="outline">
                      <DownloadIcon size={16} />
                      {t('contact.cv')}
                    </ButtonLink>
                    <ButtonLink href={`mailto:${profile.email}`} variant="outline">
                      <MailIcon size={16} />
                      {t('contact.email')}
                    </ButtonLink>
                  </div>
                </aside>

                <p className="mt-8 print:hidden">
                  <a
                    href={`/${lang}#writing`}
                    className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-link underline-offset-4 hover:underline"
                  >
                    <ArrowRightIcon size={14} className="rotate-180" />
                    {t('article.all')}
                  </a>
                </p>
              </div>

              {toc.length > 0 ? (
                <nav aria-labelledby="article-toc" className="hidden lg:block print:hidden">
                  <div className="sticky top-28">
                    <p id="article-toc" className="label text-muted">
                      {t('article.toc')}
                    </p>
                    <TocList entries={toc} activeId={activeId} />
                  </div>
                </nav>
              ) : null}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
