import { Section } from './Section';
import { BranchIcon, CodeIcon, DropletIcon, FlaskIcon, LayersIcon, SparkIcon } from '@/components/ui/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { LiveDot } from '@/components/ui/StatusChip';
import { Tag } from '@/components/ui/Tag';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';

/**
 * Column spans that leave no empty cell in the last row.
 * The grid has 2 columns on tablets and 6 half-columns (3 cards per row) on desktop.
 */
function spanFor(index: number, total: number): string {
  const tablet = total % 2 === 1 && index === total - 1 ? 'sm:col-span-2' : '';
  const rest = total % 3;
  const inLastRow = rest !== 0 && index >= total - rest;
  const desktop = !inLastRow ? 'lg:col-span-2' : rest === 2 ? 'lg:col-span-3' : 'lg:col-span-6';
  return `${tablet} ${desktop}`.trim();
}

/** Icons are assigned by position and repeat, so adding a skill group needs no code change. */
const GROUP_ICONS = [CodeIcon, LayersIcon, DropletIcon, FlaskIcon, BranchIcon] as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function Skills() {
  const { lang, t } = useLang();
  const showExploring = profile.exploring.length > 0;
  const total = profile.skills.length + (showExploring ? 1 : 0);
  return (
    <Section id="skills" kicker={t('section.skills.kicker')} title={t('section.skills')} tinted>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6 print:grid-cols-2 print:gap-x-8 print:gap-y-0">
        {profile.skills.map((group, i) => {
          // The AI group carries the violet accent reserved for everything about AI.
          const isAi = group.id === 'ai';
          const Icon = isAi ? SparkIcon : (GROUP_ICONS[i % GROUP_ICONS.length] ?? CodeIcon);
          return (
            <Reveal
              key={group.id}
              delay={(i % 3) * 0.07}
              className={cn('h-full print:mb-2', spanFor(i, total))}
            >
              <div
                data-spotlight=""
                className={cn('h-full card p-6 print:border-0 print:p-0', isAi && 'border-ai/40')}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl border bg-surface-2 print:hidden',
                      isAi ? 'border-ai/50 text-ai' : 'border-line text-link',
                    )}
                  >
                    <Icon size={20} />
                  </span>
                  <h3 className="text-lg font-bold print:text-base">{group.label[lang]}</h3>
                  <span aria-hidden="true" className="ml-auto font-mono text-xs text-muted print:hidden">
                    {pad(i + 1)}/{pad(total)}
                  </span>
                </div>
                <ul className="mt-5 flex flex-wrap gap-2 print:mt-0.5 print:gap-x-5 print:gap-y-0">
                  {group.items.map((skill) => (
                    <Tag key={skill.name}>
                      {skill.name}
                      {/* A year count says little for a tool picked up recently: shown from two years up. */}
                      {skill.years >= 2 ? (
                        <span className="ml-2 border-l border-line pl-2 font-mono text-xs text-muted tabular-nums">
                          {skill.years} {t('unit.years')}
                        </span>
                      ) : null}
                    </Tag>
                  ))}
                </ul>
              </div>
            </Reveal>
          );
        })}
        {showExploring ? (
          <Reveal
            delay={((total - 1) % 3) * 0.07}
            className={cn('h-full print:mb-2', spanFor(total - 1, total))}
          >
            <div
              data-spotlight=""
              className="h-full card border-dashed border-link/40 p-6 print:border-0 print:p-0"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 print:hidden">
                  <LiveDot />
                </span>
                <h3 className="text-lg font-bold print:text-base">{t('skills.exploring')}</h3>
                <span aria-hidden="true" className="ml-auto font-mono text-xs text-muted print:hidden">
                  {pad(total)}/{pad(total)}
                </span>
              </div>
              <ul className="mt-5 flex flex-wrap gap-2 print:mt-0.5 print:gap-x-5 print:gap-y-0">
                {profile.exploring.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}
      </div>
    </Section>
  );
}
