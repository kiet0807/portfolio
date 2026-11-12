import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown, readingMinutes, slugify } from '@/lib/markdown';

describe('parseInline', () => {
  it('reads bold, italic, code and links, and nests code inside bold', () => {
    expect(parseInline('**Tắt `allowJs` sớm.** Rồi *nghỉ*. [Docs](https://example.org)')).toEqual([
      {
        kind: 'strong',
        children: [
          { kind: 'text', text: 'Tắt ' },
          { kind: 'code', text: 'allowJs' },
          { kind: 'text', text: ' sớm.' },
        ],
      },
      { kind: 'text', text: ' Rồi ' },
      { kind: 'em', children: [{ kind: 'text', text: 'nghỉ' }] },
      { kind: 'text', text: '. ' },
      { kind: 'link', href: 'https://example.org', children: [{ kind: 'text', text: 'Docs' }] },
    ]);
  });

  it('never turns a link that could run script into a link', () => {
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,x',
      '//evil.example',
      'http://plain.example',
    ]) {
      expect(
        parseInline(`[x](${href})`).some((node) => node.kind === 'link'),
        href,
      ).toBe(false);
    }
    expect(parseInline('[home](/en)')[0]).toMatchObject({ kind: 'link', href: '/en' });
  });

  it('keeps stray markers and escaped characters as text', () => {
    expect(parseInline('5 * 3 and a ` alone')).toEqual([{ kind: 'text', text: '5 * 3 and a ` alone' }]);
    expect(parseInline('\\*not italic\\*')).toEqual([{ kind: 'text', text: '*not italic*' }]);
  });
});

describe('parseMarkdown', () => {
  it('reads headings, paragraphs, lists, quotes and code blocks', () => {
    const blocks = parseMarkdown(
      [
        'Intro line one',
        'continues here.',
        '',
        '## Vì sao không chuyển?',
        '',
        '1. **First** item',
        '2. Second item',
        '   wraps on.',
        '',
        '- a',
        '- b',
        '',
        '> quoted',
        '',
        '```ts',
        'const x = 1;',
        '```',
        '',
        '### Đợt cuối',
      ].join('\n'),
    );
    expect(blocks.map((block) => block.kind)).toEqual([
      'paragraph',
      'heading',
      'list',
      'list',
      'quote',
      'code',
      'heading',
    ]);
    expect(blocks[0]).toEqual({
      kind: 'paragraph',
      content: [{ kind: 'text', text: 'Intro line one continues here.' }],
    });
    expect(blocks[1]).toMatchObject({ level: 2, id: 'vi-sao-khong-chuyen', text: 'Vì sao không chuyển?' });
    expect(blocks[2]).toMatchObject({ ordered: true });
    expect(blocks[2]?.kind === 'list' && blocks[2].items[1]).toEqual([
      { kind: 'text', text: 'Second item wraps on.' },
    ]);
    expect(blocks[5]).toEqual({ kind: 'code', lang: 'ts', text: 'const x = 1;' });
    expect(blocks[6]).toMatchObject({ level: 3, id: 'dot-cuoi' });
  });

  it('gives repeated headings distinct anchors', () => {
    const ids = parseMarkdown('## Notes\n\n## Notes\n\n## Notes').map((block) =>
      block.kind === 'heading' ? block.id : '',
    );
    expect(ids).toEqual(['notes', 'notes-2', 'notes-3']);
  });
});

describe('slugify and reading time', () => {
  it('drops Vietnamese marks and punctuation', () => {
    expect(slugify('Đặt type cho dữ liệu, từ payload thật!')).toBe('dat-type-cho-du-lieu-tu-payload-that');
    expect(slugify('???')).toBe('section');
  });
  it('reads at 230 words a minute, never under one', () => {
    expect(readingMinutes('word '.repeat(10))).toBe(1);
    expect(readingMinutes('word '.repeat(690))).toBe(3);
  });
});
