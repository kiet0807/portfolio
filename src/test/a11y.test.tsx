import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';
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
});
