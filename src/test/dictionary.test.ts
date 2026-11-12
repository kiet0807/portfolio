import { describe, expect, it } from 'vitest';
import { SECTIONS } from '@/components/layout/sections';
import { ARTICLES } from '@/content/articles';
import { allSkills, profile, topStack } from '@/data/profile';
import { dictionary } from '@/i18n/dictionary';
import { LANGS } from '@/i18n/types';

describe('dictionary', () => {
  it('has exactly the same keys in every language', () => {
    const [first, ...rest] = LANGS.map((lang) => Object.keys(dictionary[lang]).sort());
    for (const keys of rest) expect(keys).toEqual(first);
  });

  it('has no empty strings', () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(dictionary[lang])) {
        expect(value.trim(), `${lang}:${key}`).not.toBe('');
      }
    }
  });
});

/** Walks any value and collects every object that looks like a Localized field. */
function collectLocalized(value: unknown, path: string, out: [string, Record<string, unknown>][]): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectLocalized(item, `${path}[${i}]`, out));
  } else if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('en' in record || 'vi' in record) out.push([path, record]);
    else for (const [key, child] of Object.entries(record)) collectLocalized(child, `${path}.${key}`, out);
  }
}

describe('profile data', () => {
  it('provides non-empty en and vi text for every localized field', () => {
    const fields: [string, Record<string, unknown>][] = [];
    collectLocalized(profile, 'profile', fields);
    expect(fields.length).toBeGreaterThan(20);
    for (const [path, record] of fields) {
      for (const lang of LANGS) {
        const text = record[lang];
        expect(text, `${path}.${lang} is missing`).toBeDefined();
        if (typeof text === 'string') expect(text.trim(), `${path}.${lang} is empty`).not.toBe('');
      }
    }
  });

  it('lists the same number of focus phrases in every language', () => {
    const [first, ...rest] = LANGS.map((lang) => profile.focus[lang].length);
    expect(first).toBeGreaterThan(0);
    for (const count of rest) expect(count).toBe(first);
  });

  it('uses a time zone the browser understands', () => {
    expect(() => new Intl.DateTimeFormat('en', { timeZone: profile.timeZone })).not.toThrow();
  });

  it('derives a short main stack from the skill groups', () => {
    const known = allSkills();
    const stack = topStack(4);
    expect(stack).toHaveLength(4);
    for (const item of stack) expect(known).toContain(item);
    expect(new Set(stack).size).toBe(stack.length);
  });

  it('gives every skill a name and a whole number of years', () => {
    const names = allSkills();
    expect(new Set(names).size).toBe(names.length);
    for (const group of profile.skills) {
      for (const skill of group.items) {
        expect(skill.name.trim(), group.id).not.toBe('');
        expect(Number.isInteger(skill.years) && skill.years > 0, skill.name).toBe(true);
      }
    }
  });

  it('draws a trend only from two or more points', () => {
    for (const stat of profile.stats) {
      if (stat.trend) expect(stat.trend.length, stat.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps jobs in order, newest first, with sensible years', () => {
    const starts = profile.experience.map((job) => job.startYear);
    expect(starts).toEqual([...starts].sort((a, b) => b - a));
    for (const job of profile.experience) {
      if (job.endYear !== null) expect(job.endYear, job.id).toBeGreaterThanOrEqual(job.startYear);
    }
  });

  it('uses https for every outgoing link', () => {
    const urls = [
      ...profile.socials.map((social) => social.url),
      ...profile.projects.flatMap((project) => [project.demoUrl, project.repoUrl]),
      ...profile.archive.map((item) => item.url),
      ...profile.writing.map((item) => item.url),
    ].filter((url) => url !== undefined);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^https:\/\//);
  });

  it('lists the Writing section in the navigation only when there is something to read', () => {
    const ids = SECTIONS.map((section) => section.id);
    expect(ids.includes('writing')).toBe(ARTICLES.length > 0 || profile.writing.length > 0);
    expect(ids.at(-1)).toBe('contact');
  });
});
