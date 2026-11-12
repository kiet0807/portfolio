import type { ReactNode } from 'react';
import { profile, topStack } from '@/data/profile';
import { useLang } from '@/i18n/useLang';

type TokenKind = 'keyword' | 'property' | 'string' | 'literal' | 'comment' | 'plain';
type Token = readonly [kind: TokenKind, text: string];
type Line = readonly Token[];

const COLOR: Record<TokenKind, string> = {
  keyword: 'text-(--code-keyword)',
  property: 'text-(--code-property)',
  string: 'text-(--code-string)',
  literal: 'text-(--code-literal)',
  comment: 'text-(--code-comment)',
  plain: '',
};

const str = (value: string): Token => ['string', `'${value.replaceAll("'", "\\'")}'`];
const field = (name: string, value: Token): Line => [
  ['plain', '  '],
  ['property', name],
  ['plain', ': '],
  value,
  ['plain', ','],
];
const list = (name: string, values: readonly string[]): Line[] => [
  [
    ['plain', '  '],
    ['property', name],
    ['plain', ': ['],
  ],
  ...values.map((value): Line => [['plain', '    '], str(value), ['plain', ',']]),
  [['plain', '  ],']],
];

/**
 * The profile, shown the way a developer would write it. Everything comes from
 * profile.ts, so it can never drift from the rest of the page. Decorative: the same
 * facts are in the text next to it, so the card is hidden from assistive technology.
 */
export function CodeCard() {
  const { lang } = useLang();
  const lines: Line[] = [
    [['comment', '// about.ts']],
    [
      ['keyword', 'export const'],
      ['plain', ' developer = {'],
    ],
    field('name', str(profile.name)),
    field('role', str(profile.title[lang])),
    field('based', str(profile.location[lang])),
    ...list('stack', topStack(4)),
    ...list('focus', profile.focus[lang]),
    field('available', ['literal', String(profile.availability.open)]),
    [
      ['plain', '} '],
      ['keyword', 'as const'],
      ['plain', ';'],
    ],
  ];

  return (
    <div
      aria-hidden="true"
      data-spotlight=""
      className="code-window overflow-hidden rounded-xl2 border border-line font-mono shadow-card print:hidden"
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-(--code-bar) px-4 py-3">
        <Dot />
        <Dot />
        <Dot />
        <span className="ml-3 rounded-md border border-white/10 bg-(--code-bg) px-2.5 py-1 text-xs">
          about.ts
        </span>
        <span className="ml-auto text-xs text-(--code-comment)">TypeScript</span>
      </div>
      <div className="py-4 text-xs leading-6 sm:text-[0.8125rem]">
        {lines.map((line, i) => (
          // The lines never reorder, so the index is a stable key.
          <div key={i} className="flex px-4">
            <span className="hidden w-8 shrink-0 text-right text-(--code-comment)/70 select-none sm:block">
              {i + 1}
            </span>
            <code className="min-w-0 pl-0 font-mono break-words whitespace-pre-wrap sm:pl-4">
              {line.map(([kind, text], j) => (
                <Colored key={j} kind={kind}>
                  {text}
                </Colored>
              ))}
              {i === lines.length - 1 ? (
                <span className="ml-1 inline-block h-[1.1em] w-[0.55em] translate-y-0.5 animate-blink bg-(--code-string)" />
              ) : null}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

function Colored({ kind, children }: { kind: TokenKind; children: ReactNode }) {
  return kind === 'plain' ? children : <span className={COLOR[kind]}>{children}</span>;
}

function Dot() {
  return <span className="size-2.5 rounded-full bg-white/20" />;
}
