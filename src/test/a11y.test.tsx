import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { ARTICLES, loadArticle } from '@/content/articles';
import { t } from '@/i18n/dictionary';
import type { Route } from '@/seo/head';

const routes: Route[] = [
  { kind: 'page', lang: 'en' },
  { kind: 'page', lang: 'vi' },
  { kind: 'notFound', lang: 'en' },
  { kind: 'notFound', lang: 'vi' },
];

describe('accessibility (axe-core)', () => {
  it.each(routes)('has no violations: $kind /$lang', async (route) => {
    const { container } = render(<App route={route} />);
    const results = await axe.run(container, {
      // jsdom has no layout engine, so colour contrast is covered by contrast.test.ts
      // and by Lighthouse in a real browser instead.
      rules: { 'color-contrast': { enabled: false } },
    });
    const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`);
    expect(summary).toEqual([]);
  });

  it.each(
    ARTICLES.flatMap((article) => (['en', 'vi'] as const).map((lang) => ({ slug: article.slug, lang }))),
  )('has no violations: article $slug /$lang', async ({ slug, lang }) => {
    const article = await loadArticle(slug, lang);
    const { container } = render(<App route={{ kind: 'article', lang, slug }} article={article} />);
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)).toEqual([]);
  });

  it('has no violations with the command menu open', async () => {
    const user = userEvent.setup();
    render(<App route={{ kind: 'page', lang: 'en' }} />);
    await user.click(screen.getByRole('button', { name: t('en', 'nav.palette') }));
    const dialog = (await screen.findByRole('combobox')).closest('dialog');
    expect(dialog).not.toBeNull();
    const results = await axe.run(dialog ?? document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  describe('with Kai open', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('has no violations, question chips and the AI input included', async () => {
      // The panel asks /api/chat whether the AI is on; say yes so the input is checked too.
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ai: true }) })),
      );
      const user = userEvent.setup();
      render(<App route={{ kind: 'page', lang: 'vi' }} />);
      await user.click(screen.getByRole('button', { name: t('vi', 'bot.open') }));
      const panel = await screen.findByRole('group', { name: t('vi', 'bot.name') });
      await within(panel).findByRole('textbox');
      const results = await axe.run(panel, { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  });
});
