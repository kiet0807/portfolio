import { CheckIcon, SparkIcon } from '@/components/ui/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';
import { localNumber } from '@/lib/number';

/** Target of the AI badge in the hero. */
export const AI_WORKFLOW_ID = 'ai-workflow';

/**
 * The featured block of the About section: how the work is done with AI agents, as a
 * four-step process, the numbers that back it, the agent tooling and the guardrails that keep it under
 * control. Content lives in profile.ts (`ai`). It wears the violet AI accent, like
 * everything else on the page that is about AI.
 * Not printed: the CV already says it in the About text.
 */
export function AiWorkflow() {
  const { lang } = useLang();
  const { ai } = profile;
  // The same list as the "AI & agents" card of the Skills section, so the two never drift apart.
  const toolkit = profile.skills.find((group) => group.id === 'ai')?.items ?? [];
  return (
    <Reveal className="mt-12 print:hidden">
      <div
        id={AI_WORKFLOW_ID}
        data-spotlight=""
        className="relative isolate scroll-mt-24 overflow-hidden rounded-xl2 border border-ai/40 bg-surface p-6 shadow-glow-ai sm:p-8"
      >
        {/* Light in the corner and a faint grid, so the block reads as the highlight of the section. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-20 -z-10 size-72 rounded-full bg-ai/25 blur-3xl forced-colors:hidden"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 tech-grid fade-tr forced-colors:hidden"
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
          <div>
            <p className="flex items-center gap-2 label text-ai">
              <SparkIcon size={14} className="shrink-0" />
              {ai.kicker[lang]}
            </p>
            <h3 className="mt-3 text-3xl font-light tracking-tight text-balance sm:text-4xl">
              {ai.title[lang]}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-pretty text-muted sm:text-lg">
              {ai.lead[lang]}
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
              {ai.facts.map((fact) => (
                <div key={fact.value} className="flex flex-col-reverse justify-end">
                  <dt className="mt-1 text-xs text-pretty text-muted sm:text-sm">{fact.label[lang]}</dt>
                  <dd className="text-gradient-ai font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {localNumber(fact.value, lang)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2">
            {ai.steps.map((step, i) => (
              <li key={step.id} className="rounded-2xl border border-line bg-surface-2/60 p-5">
                <span aria-hidden="true" className="font-mono text-xs text-ai">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="mt-2 font-display text-lg font-bold">{step.title[lang]}</p>
                <p className="mt-1.5 text-sm text-pretty text-muted">{step.body[lang]}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* The agent tooling in daily use. */}
        {toolkit.length > 0 ? (
          <div data-ai-toolkit="" className="mt-8 border-t border-line pt-5">
            <p className="label text-muted">{ai.toolkitTitle[lang]}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {toolkit.map((tool) => (
                <li
                  key={tool.name}
                  className="rounded-full border border-ai/50 bg-ai/10 px-3 py-1 font-mono text-xs font-medium text-ai"
                >
                  {tool.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* What stands between a draft and production. */}
        <div data-ai-guardrails="" className="mt-6 border-t border-line pt-5">
          <p className="label text-muted">{ai.guardrailsTitle[lang]}</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2.5 text-sm">
            {ai.guardrails.map((item) => (
              <li key={item.en} className="flex items-start gap-2">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-ai" />
                {item[lang]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
