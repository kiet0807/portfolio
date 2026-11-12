import { CountUp } from '@/components/ui/CountUp';
import { Sparkline } from '@/components/ui/Sparkline';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';

/**
 * Headline numbers along the bottom of the hero, each with its source and a small
 * trend line. Edit them in profile.ts (`stats`).
 */
export function HeroStats() {
  const { lang, t } = useLang();
  return (
    <dl
      aria-label={t('hero.stats')}
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 print:grid-cols-4"
    >
      {profile.stats.map((stat) => (
        <div
          key={stat.id}
          data-spotlight=""
          className="flex flex-col-reverse justify-end rounded-2xl border border-line bg-surface/70 p-3.5 sm:p-5 print:border-0 print:p-0"
        >
          <dt className="mt-1 text-sm text-pretty text-muted">{stat.label[lang]}</dt>
          <dd>
            <span aria-hidden="true" className="mb-1.5 block truncate label text-muted print:hidden">
              {stat.source}
            </span>
            <span className="flex items-end justify-between gap-2 sm:gap-3">
              <span className="shrink-0 text-gradient font-display text-[1.75rem] leading-9 font-bold tracking-tight sm:text-4xl">
                <CountUp
                  value={stat.value}
                  decimals={stat.decimals ?? 0}
                  prefix={stat.prefix ?? ''}
                  suffix={stat.suffix ?? ''}
                />
              </span>
              {stat.trend ? (
                <Sparkline
                  values={stat.trend}
                  className="mr-1 mb-1.5 h-7 max-w-14 min-w-0 flex-1 sm:max-w-20 print:hidden"
                />
              ) : null}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
