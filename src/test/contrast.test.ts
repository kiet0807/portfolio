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
  it('focus ring against the page background', () => {
    expect(contrastRatio(token(source, 'link'), token(source, 'bg'))).toBeGreaterThanOrEqual(AA_UI);
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
