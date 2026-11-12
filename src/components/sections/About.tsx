import { AiWorkflow } from './AiWorkflow';
import { CodeCard } from './CodeCard';
import { Section } from './Section';
import { Reveal } from '@/components/ui/Reveal';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';

export function About() {
  const { lang, t } = useLang();
  const { avatar } = profile;
  return (
    <Section id="about" kicker={t('section.about.kicker')} title={t('section.about')}>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <img
              src={avatar.src}
              alt={`${t('about.avatar.alt')} ${profile.name}`}
              width={avatar.width}
              height={avatar.height}
              loading="lazy"
              decoding="async"
              className="mx-auto aspect-square w-40 shrink-0 rounded-[1.75rem] border border-line shadow-card sm:mx-0 print:w-24"
            />
            <dl className="grid flex-1 gap-3">
              <div data-spotlight="" className="card px-5 py-4 print:border-0 print:p-0">
                <dt className="text-sm text-muted">{t('about.fact.role')}</dt>
                <dd className="mt-0.5 font-medium">{profile.title[lang]}</dd>
              </div>
              <div data-spotlight="" className="card px-5 py-4 print:border-0 print:p-0">
                <dt className="text-sm text-muted">{t('about.fact.location')}</dt>
                <dd className="mt-0.5 font-medium">{profile.location[lang]}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-8 space-y-5 text-base leading-relaxed sm:text-lg print:mt-3 print:space-y-2 print:text-base print:leading-normal">
            {profile.about.map((paragraph) => (
              <p key={paragraph.en} className="text-pretty">
                {paragraph[lang]}
              </p>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <CodeCard />
        </Reveal>
      </div>

      <AiWorkflow />

      {profile.principles.length > 0 ? (
        <div className="mt-12 print:mt-3">
          <h3 className="flex items-center gap-2.5 text-sm font-medium tracking-wide text-link uppercase">
            <span aria-hidden="true" className="h-px w-6 bg-link/60 print:hidden" />
            {t('about.principles')}
          </h3>
          <ol className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 print:mt-1 print:grid-cols-2 print:gap-x-8 print:gap-y-0">
            {profile.principles.map((principle, i) => (
              <li key={principle.id} className="h-full print:mb-1.5">
                <Reveal delay={(i % 4) * 0.06} className="h-full">
                  <div data-spotlight="" className="h-full card p-5 print:border-0 print:p-0">
                    <span aria-hidden="true" className="font-mono text-xs text-link print:hidden">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="mt-2 font-bold print:mt-0">{principle.title[lang]}</p>
                    <p className="mt-1.5 text-sm text-pretty text-muted print:mt-0">{principle.body[lang]}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Section>
  );
}
