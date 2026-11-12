import { Reveal } from '@/components/ui/Reveal';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';

/**
 * Feedback from colleagues: an unnumbered band between the last section and Contact.
 * An entry with a name is a quotation; one without is a summary and is not dressed as a quote.
 */
export function Testimonials() {
  const { lang, t } = useLang();
  return (
    <section
      aria-labelledby="testimonials-title"
      className="relative isolate overflow-hidden bg-surface-2/50 py-16 sm:py-20 print:hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 tech-dots fade-center forced-colors:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-link/40 to-transparent"
      />
      <div className="container-x">
        <h2
          id="testimonials-title"
          className="flex items-center gap-2.5 text-sm font-medium tracking-wide text-link uppercase"
        >
          <span aria-hidden="true" className="h-px w-6 bg-link/60" />
          {t('section.testimonials')}
        </h2>
        <p className="mt-2 text-sm text-muted">{t('testimonials.note')}</p>
        <div
          className={cn(
            'mt-6 grid gap-5',
            profile.testimonials.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3',
          )}
        >
          {profile.testimonials.map((item, i) => (
            <Reveal key={item.id} delay={(i % 3) * 0.07} className="h-full">
              <figure data-spotlight="" className="flex h-full flex-col card p-6">
                {item.name === undefined ? (
                  <p className="flex-1 text-base leading-relaxed text-pretty sm:text-lg">
                    {item.quote[lang]}
                  </p>
                ) : (
                  <>
                    <span aria-hidden="true" className="text-gradient font-mono text-3xl leading-none">
                      “
                    </span>
                    <blockquote className="mt-1 flex-1 text-base leading-relaxed text-pretty">
                      <p>{item.quote[lang]}</p>
                    </blockquote>
                  </>
                )}
                <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface-2 font-mono text-sm font-bold text-link"
                  >
                    {(item.name?.split(' ').at(-1) ?? item.role[lang]).charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold">{item.name ?? item.role[lang]}</span>
                    <span className="block text-sm text-muted">
                      {item.name === undefined ? item.where[lang] : `${item.role[lang]}, ${item.where[lang]}`}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
