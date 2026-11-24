import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/contrast';

// The real stylesheet source: changing a colour there re-runs these WCAG checks on the new value.
// (Read from disk because Vitest replaces imported CSS with an empty module.)
const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Selector not found in styles.css: ${selector}`);
  return css.slice(start, css.indexOf('\n}', start));
}

function token(source: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`).exec(source);
  if (!match?.[1]) throw new Error(`Token --${name} not found (or not a 6-digit hex)`);
  return match[1];
}

const themes = {
  dark: block(":root[data-theme='dark']"),
  light: block(":root[data-theme='light']"),
};
const theme = block('@theme');
const primary = token(theme, 'color-primary');
const primaryHover = token(theme, 'color-primary-hover');

const AA_TEXT = 4.5;
const AA_UI = 3;
/** Smallest luminance step between two stacked surfaces that still reads as two layers. */
const LAYER_STEP = 1.06;

/** A `--name: rgb(r g b / a)` token painted over an opaque hex colour, as a hex colour. */
function over(source: string, name: string, base: string): string {
  const match = new RegExp(`--${name}:\\s*rgb\\((\\d+) (\\d+) (\\d+) / ([\\d.]+)\\)`).exec(source);
  if (!match) throw new Error(`Token --${name} not found (or not rgb(r g b / a))`);
  const [r, g, b, a] = match.slice(1).map(Number) as [number, number, number, number];
  const n = Number.parseInt(base.slice(1), 16);
  const mix = (top: number, bottom: number) => Math.round(top * a + bottom * (1 - a));
  const rgb = [mix(r, (n >> 16) & 255), mix(g, (n >> 8) & 255), mix(b, n & 255)];
  return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

describe.each(Object.entries(themes))('%s theme contrast (WCAG AA)', (_name, source) => {
  const backgrounds = ['bg', 'surface', 'surface-2'] as const;

  it.each(backgrounds)('body text on --%s', (bg) => {
    expect(contrastRatio(token(source, 'fg'), token(source, bg))).toBeGreaterThanOrEqual(AA_TEXT);
  });
  it.each(backgrounds)('secondary text on --%s', (bg) => {
    expect(contrastRatio(token(source, 'muted'), token(source, bg))).toBeGreaterThanOrEqual(AA_TEXT);
  });
  it.each(backgrounds)('links on --%s', (bg) => {
    expect(contrastRatio(token(source, 'link'), token(source, bg))).toBeGreaterThanOrEqual(AA_TEXT);
  });
  // The AI accent writes small labels (Kai's role, the AI project card, the AI workflow section).
  it.each(backgrounds)('AI accent text on --%s', (bg) => {
    expect(contrastRatio(token(source, 'ai'), token(source, bg))).toBeGreaterThanOrEqual(AA_TEXT);
  });
  it('focus ring against the page background', () => {
    expect(contrastRatio(token(source, 'link'), token(source, 'bg'))).toBeGreaterThanOrEqual(AA_UI);
  });
  // Skills, Projects and Testimonials lay --tint over the page; their cards must not melt into it.
  // (Before 2026-11-24 the dark wash was --surface-2 at 50 %, 1.04:1 against the cards: only the border showed.)
  it('cards stand out from a tinted section', () => {
    const tinted = over(source, 'tint', token(source, 'bg'));
    expect(contrastRatio(token(source, 'surface'), tinted)).toBeGreaterThanOrEqual(LAYER_STEP);
  });
});

describe('primary button contrast (WCAG AA)', () => {
  it('white label on primary and on its hover colour', () => {
    expect(contrastRatio('#ffffff', primary)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio('#ffffff', primaryHover)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('code card contrast (WCAG AA)', () => {
  // The card is dark in both themes, so one set of colours covers everything.
  const code = block('.code-window');
  const inks = ['code-fg', 'code-keyword', 'code-property', 'code-string', 'code-literal', 'code-comment'];

  it.each(inks)('--%s on the editor background and on its title bar', (ink) => {
    expect(contrastRatio(token(code, ink), token(code, 'code-bg'))).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(token(code, ink), token(code, 'code-bar'))).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});
