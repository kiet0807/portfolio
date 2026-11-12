import { Section } from './Section';
import { ArrowUpRightIcon } from '@/components/ui/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';

/** Articles and talks, newest first, as a log inside one card. The whole row is the link target. */
export function Writing() {
  const { lang, t } = useLang();
  return (
    <Section id="writing" kicker={t('section.writing.kicker')} title={t('section.writing')}>
      <Reveal>
        <div data-spotlight="" className="card px-6 py-3 print:border-0 print:p-0">
          <ul className="divide-y divide-line print:divide-y-0">
            {profile.writing.map((item) => (
              <li
                key={item.id}
                className="group relative -mx-3 grid grid-cols-[minmax(0,1fr)_1.25rem] gap-x-6 gap-y-1.5 px-3 py-4 transition-colors duration-300 hover:bg-surface-2/70 lg:grid-cols-[5rem_5.5rem_minmax(0,1fr)_13rem_1.25rem] lg:items-baseline print:mx-0 print:block print:p-0 print:pb-1.5"
              >
                <p className="col-span-2 flex items-center gap-3 lg:contents">
                  <time dateTime={item.date} className="font-mono text-sm text-link">
                    {item.date.replace('-', '.')}
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
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-print-url=""
                  className="text-lg font-bold text-pretty underline-offset-4 group-hover:text-link after:absolute after:inset-0 hover:underline print:text-base print:after:static"
                >
                  {item.title[lang]}
                  <span className="sr-only"> ({t('a11y.external')})</span>
                </a>
                <ArrowUpRightIcon
                  size={16}
                  className="justify-self-end text-muted transition-transform duration-300 ease-water group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-link lg:col-start-5 lg:row-start-1 print:hidden"
                />
                <p className="col-span-2 text-sm text-muted lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:text-right">
                  {item.venue}
                  <span className="font-mono text-xs tabular-nums">
                    {' · '}
                    {item.minutes} {t('unit.minutes')}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Section>
  );
}
