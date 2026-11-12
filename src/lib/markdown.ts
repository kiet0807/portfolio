/**
 * A small Markdown reader for the articles in src/content/writing.
 *
 * It understands what the articles use and nothing more: `##` and `###` headings,
 * paragraphs, `-` and `1.` lists, `>` quotes, fenced code blocks, `| a | b |` tables, and inline **bold**,
 * *italic*, `code` and [links](https://…). Everything else stays plain text: the output is
 * data for React to render, never HTML, so an article cannot inject markup.
 *
 * Only `import type` this module from code on the initial bundle. The parser itself is
 * loaded on demand by src/content/articles.ts, together with the article text.
 */

export type Inline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'strong' | 'em'; readonly children: readonly Inline[] }
  | { readonly kind: 'link'; readonly href: string; readonly children: readonly Inline[] };

export type Block =
  | {
      readonly kind: 'heading';
      readonly level: 2 | 3;
      /** Anchor for the table of contents, unique within the article. */
      readonly id: string;
      /** The heading as plain text (for the table of contents). */
      readonly text: string;
      readonly content: readonly Inline[];
    }
  | { readonly kind: 'paragraph'; readonly content: readonly Inline[] }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly (readonly Inline[])[] }
  | { readonly kind: 'quote'; readonly content: readonly Inline[] }
  | { readonly kind: 'code'; readonly lang: string; readonly text: string }
  | {
      readonly kind: 'table';
      readonly head: readonly (readonly Inline[])[];
      readonly rows: readonly (readonly (readonly Inline[])[])[];
    };

const FENCE = /^```(\w*)\s*$/;
const HEADING = /^(#{2,3})\s+(.+)$/;
const BULLET = /^[-*]\s+/;
const NUMBERED = /^\d+\.\s+/;
const TABLE_ROW = /^\|.*\|\s*$/;
const TABLE_RULE = /^\|(\s*:?-{3,}:?\s*\|)+\s*$/;

function startsBlock(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line) ||
    line.startsWith('>') ||
    TABLE_ROW.test(line)
  );
}

/** "| a | `b|c` |" → ["a", "`b|c`"]: splits on the pipes outside code spans. */
function tableCells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cell = '';
  let inCode = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i] ?? '';
    if (ch === '\\' && inner[i + 1] === '|') {
      cell += '|';
      i++;
    } else if (ch === '`') {
      inCode = !inCode;
      cell += ch;
    } else if (ch === '|' && !inCode) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/** Index of the closing marker, skipping escaped characters and code spans; -1 when there is none. */
function findClosing(source: string, marker: '**' | '*', from: number): number {
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '`') {
      const end = source.indexOf('`', i + 1);
      if (end > -1) i = end;
      continue;
    }
    if (marker === '*' && source.startsWith('**', i)) {
      i++;
      continue;
    }
    if (source.startsWith(marker, i) && source[i - 1] !== ' ') return i;
  }
  return -1;
}

/** Only addresses that cannot run script: https, a path on this site, or an anchor. */
const SAFE_HREF = /^(https:\/\/|\/(?!\/)|#)/;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const flush = () => {
    if (text !== '') out.push({ kind: 'text', text });
    text = '';
  };

  let i = 0;
  while (i < source.length) {
    const ch = source[i] ?? '';
    const next = source[i + 1] ?? '';

    if (ch === '\\' && next !== '') {
      text += next;
      i += 2;
      continue;
    }
    if (ch === '`') {
      const end = source.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        out.push({ kind: 'code', text: source.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '*' && next === '*' && !/\s/.test(source[i + 2] ?? ' ')) {
      const end = findClosing(source, '**', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ kind: 'strong', children: parseInline(source.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (ch === '*' && next !== '*' && !/\s/.test(next || ' ')) {
      const end = findClosing(source, '*', i + 1);
      if (end > i + 1) {
        flush();
        out.push({ kind: 'em', children: parseInline(source.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '[') {
      const middle = source.indexOf('](', i + 1);
      const end = middle > -1 ? source.indexOf(')', middle + 2) : -1;
      const href = end > -1 ? source.slice(middle + 2, end) : '';
      if (middle > i + 1 && SAFE_HREF.test(href)) {
        flush();
        out.push({ kind: 'link', href, children: parseInline(source.slice(i + 1, middle)) });
        i = end + 1;
        continue;
      }
    }
    text += ch;
    i += 1;
  }
  flush();
  return out;
}

export function plainText(nodes: readonly Inline[]): string {
  return nodes.map((node) => ('children' in node ? plainText(node.children) : node.text)).join('');
}

/** "Vì sao không chuyển?" → "vi-sao-khong-chuyen". Vietnamese letters lose their marks. */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  const uniqueId = (base: string) => {
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i] ?? '')) body.push(lines[i++] ?? '');
      i++;
      blocks.push({ kind: 'code', lang: fence[1] ?? '', text: body.join('\n') });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const content = parseInline((heading[2] ?? '').trim());
      const text = plainText(content);
      blocks.push({
        kind: 'heading',
        level: heading[1] === '##' ? 2 : 3,
        id: uniqueId(slugify(text)),
        text,
        content,
      });
      i++;
      continue;
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line);
      const marker = ordered ? NUMBERED : BULLET;
      const items: Inline[][] = [];
      while (i < lines.length && marker.test(lines[i] ?? '')) {
        let item = (lines[i] ?? '').replace(marker, '');
        i++;
        // An indented line continues the item above it.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i] ?? '')) item += ` ${(lines[i++] ?? '').trim()}`;
        items.push(parseInline(item));
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // A table: a header row, a rule row of dashes, then body rows. Short rows are padded.
    if (TABLE_ROW.test(line) && TABLE_RULE.test(lines[i + 1] ?? '')) {
      const head = tableCells(line);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i] ?? '')) {
        const cells = tableCells(lines[i++] ?? '');
        rows.push(head.map((_, c) => parseInline(cells[c] ?? '')));
      }
      blocks.push({ kind: 'table', head: head.map((cell) => parseInline(cell)), rows });
      continue;
    }

    if (line.startsWith('>')) {
      const parts: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('>'))
        parts.push((lines[i++] ?? '').replace(/^>\s?/, ''));
      blocks.push({ kind: 'quote', content: parseInline(parts.join(' ')) });
      continue;
    }

    // A paragraph runs until a blank line or the start of another block.
    const parts: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      (parts.length === 0 || !startsBlock(lines[i] ?? ''))
    ) {
      parts.push((lines[i++] ?? '').trim());
    }
    blocks.push({ kind: 'paragraph', content: parseInline(parts.join(' ')) });
  }
  return blocks;
}

/** Words in the text, for reading time. Vietnamese counts syllables, which reads at about the same pace. */
export function wordCount(source: string): number {
  // Only tokens with a letter or digit count: table pipes, rules and list markers do not.
  return source.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Minutes to read at 230 words a minute, never less than one. */
export function readingMinutes(source: string): number {
  return Math.max(1, Math.round(wordCount(source) / 230));
}
