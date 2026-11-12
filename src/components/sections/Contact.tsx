import { Section } from './Section';
import { ButtonLink } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { DownloadIcon, GithubIcon, GitlabIcon, LinkedinIcon, MailIcon } from '@/components/ui/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { StatusChip } from '@/components/ui/StatusChip';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';

const socialIcons = { github: GithubIcon, gitlab: GitlabIcon, linkedin: LinkedinIcon } as const;

export function Contact() {
  const { lang, t } = useLang();
  return (
    <Section id="contact" kicker={t('section.contact.kicker')} title={t('section.contact')}>
      <Reveal>
        <div data-spotlight="" className="relative overflow-hidden card p-6 sm:p-10 print:border-0 print:p-0">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 tech-grid fade-tr print:hidden forced-colors:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(circle,rgb(34_211_238/0.22),transparent_70%)] print:hidden"
          />
          {profile.availability.open ? (
            <StatusChip className="relative mb-5 bg-surface-2 print:hidden">
              {profile.availability.label[lang]}
            </StatusChip>
          ) : null}
          <p className="relative max-w-xl text-lg text-pretty sm:text-xl">{profile.contactNote[lang]}</p>
          {profile.availability.open && profile.availability.details.length > 0 ? (
            <dl
              aria-label={t('contact.availability')}
              className="relative mt-6 grid gap-3 sm:grid-cols-3 print:hidden"
            >
              {profile.availability.details.map((fact) => (
                <div key={fact.id} className="rounded-xl border border-line bg-surface-2/70 px-4 py-3">
                  <dt className="label text-muted">{fact.label[lang]}</dt>
                  <dd className="mt-1 text-sm font-medium text-pretty">{fact.value[lang]}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="relative mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted">{t('contact.email')}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <a
                  href={`mailto:${profile.email}`}
                  className="inline-flex min-h-9 items-center gap-2 text-lg font-medium break-all text-link underline-offset-4 hover:underline"
                >
                  <MailIcon size={18} className="shrink-0" />
                  {profile.email}
                </a>
                <span className="print:hidden">
                  <CopyButton value={profile.email} />
                </span>
              </div>
              <div className="mt-8 print:hidden">
                <ButtonLink href={profile.cv[lang]} download>
                  <DownloadIcon size={16} />
                  {t('contact.cv')}
                </ButtonLink>
                <p className="mt-2 text-sm text-muted">{t('contact.cv.hint')}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted">{t('contact.social')}</h3>
              <ul className="mt-2 space-y-2">
                {profile.socials.map((social) => {
                  const Icon = socialIcons[social.id];
                  return (
                    <li key={social.id}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-2.5 transition-colors duration-300 hover:border-link"
                      >
                        <Icon size={20} className="shrink-0 text-link" />
                        <span className="min-w-0">
                          <span className="block font-medium">{social.label}</span>
                          <span className="block text-sm break-all text-muted">{social.handle}</span>
                        </span>
                        <span className="sr-only">({t('a11y.external')})</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
