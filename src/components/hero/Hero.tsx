import { HeroStats } from './HeroStats';
import { HeroVisual } from './HeroVisual';
import { TOP_ID } from '@/components/layout/sections';
import { ButtonLink } from '@/components/ui/Button';
import { AI_WORKFLOW_ID } from '@/components/sections/AiWorkflow';
import { ArrowDownIcon, MailIcon, PinIcon, SparkIcon } from '@/components/ui/Icons';
import { StatusChip } from '@/components/ui/StatusChip';
import { Typewriter } from '@/components/ui/Typewriter';
import { Waves } from '@/components/ui/Waves';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';

// The given name is set in the serif accent face, wherever it stands in the full name.
const NAME_AT = profile.name.indexOf(profile.givenName);
const NAME_PARTS =
  NAME_AT < 0
    ? { before: profile.name, accent: '', after: '' }
    : {
        before: profile.name.slice(0, NAME_AT),
        accent: profile.givenName,
        after: profile.name.slice(NAME_AT + profile.givenName.length),
      };

export function Hero() {
  const { lang, t } = useLang();
  return (
    <section
      id={TOP_ID}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh flex-col overflow-hidden hero-gradient print:min-h-0"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 stars print:hidden forced-colors:hidden"
      />
      <div className="container-x grid flex-1 items-center gap-10 pt-28 pb-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12 print:block print:pt-0 print:pb-4">
        <div>
          <div className="mb-6 flex flex-wrap items-center gap-2.5 print:mb-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-fg print:border-0 print:p-0">
              <PinIcon size={16} className="shrink-0 text-link" />
              {profile.location[lang]}
            </p>
            {profile.availability.open ? (
              <StatusChip className="print:hidden">{profile.availability.label[lang]}</StatusChip>
            ) : null}
          </div>
          <h1
            id="hero-title"
            className="text-[3.25rem] leading-[1.05] font-light tracking-tight text-balance sm:text-7xl lg:text-[5rem] xl:text-[5.5rem] 2xl:text-[6.5rem] print:text-3xl print:font-bold"
          >
            <span className="block text-lg leading-normal font-medium tracking-normal text-muted sm:text-xl xl:text-2xl print:hidden">
              {t('hero.greeting')}
            </span>{' '}
            <span className="mt-2 block pb-1">
              {NAME_PARTS.before}
              <em className="text-gradient accent-serif print:font-display print:font-bold print:not-italic">
                {NAME_PARTS.accent}
              </em>
              {NAME_PARTS.after}
            </span>
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-2 font-display text-xl font-medium sm:text-2xl xl:text-3xl print:text-lg">
            {profile.title[lang]}
            {/* What sets the work apart today; leads to the full story in About. */}
            <a
              href={`#${AI_WORKFLOW_ID}`}
              data-ai-badge=""
              className="inline-flex items-center gap-1.5 rounded-full border border-ai/50 bg-ai/10 px-3 py-1 font-mono text-xs font-medium tracking-[0.12em] text-ai uppercase shadow-glow-ai transition-colors duration-300 hover:border-ai hover:bg-ai/20 print:hidden"
            >
              <SparkIcon size={14} className="shrink-0" />
              {profile.ai.badge[lang]}
              <span className="sr-only">: {profile.ai.title[lang]}</span>
            </a>
          </p>
          <Typewriter
            phrases={profile.focus[lang]}
            label={t('hero.focus')}
            className="mt-3 text-muted print:hidden"
          />
          <p className="mt-5 max-w-xl text-base text-pretty text-muted sm:text-lg xl:text-xl print:mt-2 print:text-base">
            {profile.tagline[lang]}
          </p>
          {/* On paper the buttons are useless; print the contact details instead. */}
          <p className="mt-2 hidden text-sm print:block">
            {[profile.email, ...profile.socials.map((s) => s.handle)].join(' · ')}
          </p>
          <div className="mt-9 flex flex-wrap gap-3 print:hidden">
            <ButtonLink href="#projects" className="group">
              {t('hero.cta.projects')}
              <ArrowDownIcon
                size={16}
                className="transition-transform duration-300 ease-water group-hover:translate-y-0.5"
              />
            </ButtonLink>
            <ButtonLink href="#contact" variant="outline">
              <MailIcon size={16} />
              {t('hero.cta.contact')}
            </ButtonLink>
          </div>
        </div>
        <HeroVisual />
      </div>
      <div className="container-x pb-28 sm:pb-36 print:pb-2">
        <HeroStats />
      </div>
      <Waves />
    </section>
  );
}
