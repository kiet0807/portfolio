import { ActivityIcon } from '@/components/ui/Icons';
import { useVitals } from '@/hooks/useVitals';
import type { DictKey } from '@/i18n/dictionary';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';
import { localNumber } from '@/lib/number';
import { formatVital, rateVital, VITAL_SPECS, vitalRatio, type VitalRating } from '@/lib/vitals';

const RATING_LABEL: Record<VitalRating, DictKey> = {
  good: 'footer.vitals.good',
  fair: 'footer.vitals.fair',
  poor: 'footer.vitals.poor',
};

/**
 * Live telemetry: the Core Web Vitals of this very page view, read from the
 * visitor's own browser. Prerendered with placeholders, filled in after hydration.
 */
export function Vitals() {
  const { lang, t } = useLang();
  const vitals = useVitals();
  return (
    <section
      aria-labelledby="vitals-title"
      data-spotlight=""
      className="rounded-xl2 border border-line bg-surface/60 p-5 sm:p-6"
    >
      <h2 id="vitals-title" className="flex items-center gap-2.5 text-base font-bold">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-link">
          <ActivityIcon size={16} />
        </span>
        {t('footer.vitals.title')}
      </h2>
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {VITAL_SPECS.map((spec) => {
          const value = vitals[spec.id];
          const rating = value === null ? null : rateVital(value, spec);
          return (
            <div
              key={spec.id}
              data-vital={spec.id}
              className="relative rounded-xl border border-line bg-bg/60 p-4"
            >
              <dt>
                <span className="block font-mono text-xs font-bold tracking-widest text-link uppercase">
                  {spec.id}
                </span>
                <span className="mt-0.5 block min-h-8 text-xs text-muted sm:min-h-0">{spec.name}</span>
              </dt>
              <dd className="mt-3">
                <span className="block font-mono text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl">
                  {value === null ? '--' : localNumber(formatVital(value, spec.id), lang)}
                </span>
                {/* The verdict sits in the tile's top-right corner, level with the metric name. */}
                <span
                  data-rating={rating ?? 'pending'}
                  className={cn(
                    'absolute top-4 right-4 text-xs',
                    rating === 'good' ? 'text-link' : 'text-muted',
                  )}
                >
                  {t(rating === null ? 'footer.vitals.pending' : RATING_LABEL[rating])}
                </span>
                <span aria-hidden="true" className="mt-3 block h-1 overflow-hidden rounded-full bg-line">
                  <span
                    className="block h-full origin-left rounded-full bg-linear-to-r from-primary to-accent transition-transform duration-700 ease-water"
                    style={{
                      transform: `scaleX(${String(value === null ? 0 : Math.max(0.04, vitalRatio(value, spec)))})`,
                    }}
                  />
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-4 text-sm text-pretty text-muted">{t('footer.vitals.note')}</p>
    </section>
  );
}
