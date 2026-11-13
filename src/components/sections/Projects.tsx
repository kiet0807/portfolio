import { ProjectVisual } from './ProjectVisual';
import { Section } from './Section';
import { ArrowUpRightIcon, ExternalIcon, GithubIcon, LockIcon, SparkIcon } from '@/components/ui/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { Tag } from '@/components/ui/Tag';
import { TiltCard } from '@/components/ui/TiltCard';
import { profile, type Project } from '@/data/profile';
import { cn } from '@/lib/cn';
import { useLang } from '@/i18n/useLang';

const linkClass =
  'text-link inline-flex min-h-9 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline';

/**
 * A project card. Work about AI (`project.ai`) takes the violet accent and the whole row:
 * on large screens its visual sits on the left and the text on the right.
 */
function ProjectCard({ project }: { project: Project }) {
  const { lang, t } = useLang();
  const ai = project.ai === true;
  return (
    <TiltCard
      accent={ai ? 'ai' : undefined}
      className={cn(
        'group flex flex-col overflow-hidden print:border-0',
        ai && 'lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]',
      )}
    >
      <ProjectVisual
        project={project}
        className={
          ai ? 'lg:flex lg:flex-col lg:justify-end lg:border-r lg:border-b-0 lg:px-8 lg:pt-8' : undefined
        }
      />
      <div className="flex flex-1 flex-col p-6 print:p-0">
        <p className={cn('flex items-center justify-between gap-3 label', ai ? 'text-ai' : 'text-link')}>
          <span className="inline-flex items-center gap-1.5">
            {ai ? <SparkIcon size={14} className="print:hidden" /> : null}
            {project.type[lang]}
          </span>
          <time dateTime={String(project.year)} className="text-muted">
            {project.year}
          </time>
        </p>
        <h3 className="mt-2 text-xl font-bold print:mt-0">{project.name}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {t('project.role')}: {project.role[lang]}
        </p>
        <p className="mt-3 text-pretty text-muted print:mt-0.5">{project.description[lang]}</p>
        <dl
          aria-label={t('project.results')}
          className="mt-5 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-surface-2/60 print:mt-1 print:divide-x-0 print:overflow-visible print:rounded-none print:border-0 print:bg-transparent"
        >
          {project.metrics.map((metric) => (
            <div
              key={metric.value}
              className="flex flex-col-reverse justify-end px-3 py-2.5 lg:px-2 xl:px-3 print:p-0"
            >
              <dt className="mt-0.5 text-xs text-pretty text-muted">{metric.label[lang]}</dt>
              <dd className="font-mono text-base font-bold whitespace-nowrap text-fg tabular-nums">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
        <ul aria-label={t('project.tech')} className="mt-4 flex flex-wrap gap-2">
          {project.tech.map((tech) => (
            <Tag key={tech}>{tech}</Tag>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap gap-x-6 gap-y-1 pt-6 print:block print:pt-2">
          {project.demoUrl ? (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noreferrer noopener"
              data-print-url=""
              className={linkClass}
            >
              <ExternalIcon size={16} />
              {t('project.demo')}
              <span className="sr-only">
                : {project.name} ({t('a11y.external')})
              </span>
            </a>
          ) : null}
          {project.appUrl ? (
            <a href={project.appUrl} target="_blank" rel="noreferrer noopener" className={linkClass}>
              <ArrowUpRightIcon size={16} />
              {t('project.app')}
              <span className="sr-only">
                : {project.name} ({t('a11y.external')})
              </span>
            </a>
          ) : null}
          {project.repoUrl ? (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer noopener"
              data-print-url=""
              className={linkClass}
            >
              <GithubIcon size={16} />
              {t('project.source')}
              <span className="sr-only">
                : {project.name} ({t('a11y.external')})
              </span>
            </a>
          ) : (
            <p className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted print:min-h-0">
              <LockIcon size={16} className="print:hidden" />
              {t('project.private')}
            </p>
          )}
        </div>
      </div>
    </TiltCard>
  );
}

/** Smaller projects as a list inside one card. The whole row is the link target. */
function Archive() {
  const { lang, t } = useLang();
  return (
    <Reveal className="mt-10 print:mt-3">
      <div data-spotlight="" data-print-flow="" className="card p-6 print:border-0 print:p-0">
        <h3 className="text-lg font-bold print:text-base">{t('projects.archive')}</h3>
        <ul className="mt-3 divide-y divide-line print:mt-1 print:grid print:grid-cols-2 print:gap-x-8 print:divide-y-0">
          {profile.archive.map((item) => (
            <li
              key={item.id}
              className="group relative -mx-3 grid grid-cols-[minmax(0,1fr)_1.25rem] gap-x-6 gap-y-1 px-3 py-4 transition-colors duration-300 hover:bg-surface-2/70 lg:grid-cols-[3.5rem_minmax(0,1fr)_13rem_1.25rem] lg:items-baseline print:mx-0 print:block print:p-0 print:pb-1.5"
            >
              <time
                dateTime={String(item.year)}
                className="col-span-2 font-mono text-sm text-link lg:col-span-1 print:mr-2"
              >
                {item.year}
              </time>
              <div className="min-w-0 print:inline">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    data-print-url=""
                    className="font-bold underline-offset-4 group-hover:text-link after:absolute after:inset-0 hover:underline print:after:static"
                  >
                    {item.name}
                    <span className="sr-only"> ({t('a11y.external')})</span>
                  </a>
                ) : (
                  <p className="font-bold">{item.name}</p>
                )}
                <p className="mt-0.5 text-sm text-pretty text-muted">{item.description[lang]}</p>
              </div>
              {item.url ? (
                <ArrowUpRightIcon
                  size={16}
                  className="col-start-2 row-start-2 justify-self-end text-muted transition-transform duration-300 ease-water group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-link lg:col-start-4 lg:row-start-1 print:hidden"
                />
              ) : null}
              <p className="col-span-2 font-mono text-xs text-muted lg:col-span-1 lg:col-start-3 lg:row-start-1">
                <span className="sr-only">{t('project.tech')}: </span>
                {item.tech.join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

export function Projects() {
  const { t } = useLang();
  return (
    <Section id="projects" kicker={t('section.projects.kicker')} title={t('section.projects')} tinted>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 print:block">
        {profile.projects.map((project, i) => (
          <Reveal
            key={project.id}
            delay={(i % 3) * 0.08}
            className={cn(
              'h-full print:mb-5',
              project.ai && 'md:col-span-2 lg:col-span-3',
              project.paper === false && 'print:hidden',
            )}
          >
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>
      {profile.archive.length > 0 ? <Archive /> : null}
    </Section>
  );
}
