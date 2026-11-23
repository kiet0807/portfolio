import { Section } from './Section';
import { Reveal } from '@/components/ui/Reveal';
import { Tag } from '@/components/ui/Tag';
import { profile } from '@/data/profile';
import { cn } from '@/lib/cn';
import { useLang } from '@/i18n/useLang';

/**
 * Timeline. Vertical on phones and tablets; from `lg` up the jobs sit in two columns
 * (newest first) under a horizontal line, so the section uses the full width. The current
 * job, the longest, takes the whole first row with its highlights in two columns; the
 * others pair up below, so no card stretches to the height of a much longer neighbour.
 * Each item draws its own segment of the line, so any number of jobs simply wraps.
 */
export function Experience() {
  const { lang, t } = useLang();
  return (
    <Section id="experience" kicker={t('section.experience.kicker')} title={t('section.experience')}>
      <div className="relative">
        {/* A pulse of light travelling along the horizontal timeline (desktop only). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-px overflow-hidden lg:block print:hidden forced-colors:hidden"
        >
          <div className="h-full w-full animate-signal bg-[linear-gradient(90deg,transparent_35%,var(--color-accent)_50%,transparent_65%)]" />
        </div>
        <ol className="relative ml-2 space-y-8 border-l border-line sm:ml-3 lg:-mx-3 lg:grid lg:grid-cols-2 lg:space-y-0 lg:gap-y-10 lg:border-l-0 print:ml-0 print:block print:space-y-3 print:border-l-0">
          {profile.experience.map((job, index) => (
            <li
              key={job.id}
              className={cn(
                'relative pl-7 sm:pl-10 lg:border-t lg:border-line lg:px-3 lg:pt-10 print:border-t-0 print:p-0',
                index === 0 && 'lg:col-span-2',
              )}
            >
              <span
                aria-hidden="true"
                className="absolute top-7 -left-[7px] size-3.5 rounded-full border-2 border-bg bg-link shadow-[0_0_0_4px_rgb(34_211_238/0.18)] lg:-top-[7px] lg:left-9 print:hidden"
              />
              <Reveal className="h-full">
                <article data-spotlight="" className="flex h-full flex-col card p-6 print:border-0 print:p-0">
                  <p className="font-mono text-sm font-medium text-link">
                    <time dateTime={String(job.startYear)}>{job.startYear}</time>
                    {/* A job that started and ended in the same year shows that year once. */}
                    {job.endYear === job.startYear ? null : ' – '}
                    {job.endYear === null ? (
                      t('experience.present')
                    ) : job.endYear === job.startYear ? null : (
                      <time dateTime={String(job.endYear)}>{job.endYear}</time>
                    )}
                  </p>
                  <h3 className="mt-1.5 text-xl font-bold">{job.role[lang]}</h3>
                  <p className="mt-0.5 font-medium">{job.company}</p>
                  <p className="mt-1 text-sm text-pretty text-muted">{job.context[lang]}</p>
                  <ul
                    className={cn(
                      'mt-4 list-disc space-y-2 pl-5 marker:text-link print:mt-1 print:space-y-0',
                      index === 0 && 'lg:columns-2 lg:space-y-0 lg:gap-x-12 print:columns-1',
                    )}
                  >
                    {job.highlights.map((h) => (
                      <li
                        key={h.en}
                        className={cn('text-pretty', index === 0 && 'lg:mb-2 lg:break-inside-avoid')}
                      >
                        {h[lang]}
                      </li>
                    ))}
                  </ul>
                  <ul
                    aria-label={t('experience.stack')}
                    className="mt-auto flex flex-wrap gap-2 pt-5 print:hidden"
                  >
                    {job.stack.map((item) => (
                      <Tag key={item}>{item}</Tag>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>

      {profile.credentials.length > 0 ? (
        <Reveal className="mt-10 print:mt-3">
          <div data-spotlight="" className="card p-6 print:border-0 print:p-0">
            <h3 className="text-lg font-bold print:text-base">{t('experience.credentials')}</h3>
            <ul className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-3 print:mt-1 print:block">
              {profile.credentials.map((item) => (
                <li key={item.id} className="border-l-2 border-link/50 pl-4 print:border-0 print:pl-0">
                  <span className="block font-mono text-sm text-link print:mr-3 print:inline-block print:w-24">
                    {item.period}
                  </span>
                  <span className="mt-1 block font-medium text-pretty print:mt-0 print:inline">
                    {item.title[lang]}
                  </span>
                  <span className="block text-sm text-muted print:ml-2 print:inline">
                    {item.issuer[lang]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      ) : null}
    </Section>
  );
}
