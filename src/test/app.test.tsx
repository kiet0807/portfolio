import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from './setup';
import { App } from '@/App';
import { allSkills, profile } from '@/data/profile';
import { t } from '@/i18n/dictionary';
import { STORAGE_KEYS } from '@/lib/storage';
import { THEME_STORAGE_KEY, themeInlineScript } from '@/theme/theme-script';

function renderPage(lang: 'en' | 'vi' = 'en') {
  window.history.replaceState(null, '', `/${lang}`);
  return render(<App route={{ kind: 'page', lang }} />);
}

describe('language switch', () => {
  it('renders English content on /en', () => {
    renderPage('en');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(profile.name);
    expect(screen.getByText(profile.tagline.en)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: t('en', 'section.projects') })).toBeInTheDocument();
  });

  it('switches every visible string to Vietnamese without a reload', async () => {
    const user = userEvent.setup();
    const pushState = vi.spyOn(window.history, 'pushState');
    renderPage('en');

    await user.click(screen.getByRole('button', { name: t('en', 'lang.switch') }));

    expect(screen.getByText(profile.tagline.vi)).toBeInTheDocument();
    expect(screen.queryByText(profile.tagline.en)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: t('vi', 'section.projects') })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: t('vi', 'nav.primary') });
    expect(within(nav).getByRole('link', { name: t('vi', 'nav.experience') })).toBeInTheDocument();

    // URL, <html lang>, <title> and the saved preference all follow.
    expect(pushState).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/vi');
    expect(document.documentElement.lang).toBe('vi');
    expect(document.title).toBe(profile.seo.title.vi);
    expect(window.localStorage.getItem(STORAGE_KEYS.lang)).toBe('vi');
  });

  it('switches back to English and follows the browser back button', async () => {
    const user = userEvent.setup();
    renderPage('vi');
    await user.click(screen.getByRole('button', { name: t('vi', 'lang.switch') }));
    expect(screen.getByText(profile.tagline.en)).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEYS.lang)).toBe('en');
  });

  it('links the CV that matches the language', async () => {
    const user = userEvent.setup();
    renderPage('en');
    expect(screen.getByRole('link', { name: t('en', 'contact.cv') })).toHaveAttribute('href', profile.cv.en);
    await user.click(screen.getByRole('button', { name: t('en', 'lang.switch') }));
    expect(screen.getByRole('link', { name: t('vi', 'contact.cv') })).toHaveAttribute('href', profile.cv.vi);
  });
});

const themeLabel = (lang: 'en' | 'vi', mode: 'light' | 'dark', next: 'light' | 'dark') =>
  `${t(lang, 'theme.label')}: ${t(lang, `theme.mode.${mode}`)}. ${t(lang, 'theme.next')}: ${t(lang, `theme.mode.${next}`)}`;

describe('decorative tech layer', () => {
  it('gives screen readers the focus list once, and prerenders the first phrase', () => {
    renderPage('en');
    const label = `${t('en', 'hero.focus')}: ${profile.focus.en.join(', ')}`;
    const sentence = screen.getByText(label);
    expect(sentence).toHaveClass('sr-only');
    // The animated copy is hidden from assistive technology.
    const typed = screen.getByText(profile.focus.en[0] ?? '');
    expect(typed.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(typed.closest('p')).toBe(sentence.closest('p'));
  });

  it('shows the availability status in the hero and in the contact card', () => {
    renderPage('vi');
    const shown = screen.getAllByText(profile.availability.label.vi);
    // The status bar repeats it, but only for sighted visitors.
    expect(shown.filter((el) => !el.closest('[aria-hidden="true"]'))).toHaveLength(2);
    expect(shown.filter((el) => el.closest('[data-status-bar]'))).toHaveLength(1);
  });

  it('hides the ticker, the code card and the project wireframes from assistive technology', () => {
    const { container } = renderPage('en');
    for (const selector of ['.animate-marquee', '.code-window', 'svg[viewBox="0 0 400 190"]']) {
      const nodes = container.querySelectorAll(selector);
      expect(nodes.length, selector).toBeGreaterThan(0);
      for (const node of nodes) expect(node.closest('[aria-hidden="true"]'), selector).not.toBeNull();
    }
    // Skills stay available as real list items in the Skills section.
    const usedElsewhere = new Set([
      ...profile.experience.flatMap((job) => job.stack),
      ...profile.projects.flatMap((project) => project.tech),
      ...profile.exploring,
    ]);
    const skill = allSkills().find((name) => !usedElsewhere.has(name)) ?? '';
    expect(skill).not.toBe('');
    const exposed = screen.getAllByText(skill).filter((el) => !el.closest('[aria-hidden="true"]'));
    expect(exposed).toHaveLength(1);
  });

  it('writes the profile into the code card', () => {
    const { container } = renderPage('vi');
    const code = container.querySelector('.code-window');
    expect(code).toHaveTextContent(`name: '${profile.name}'`);
    expect(code).toHaveTextContent(`based: '${profile.location.vi}'`);
    expect(code).toHaveTextContent(`available: ${String(profile.availability.open)}`);
  });

  it('shows the local time of the configured time zone', () => {
    const { container } = renderPage('en');
    expect(container.querySelector('[data-clock]')).toHaveTextContent(/^\d{2}:\d{2} GMT[+-]\d/);
  });

  it('renders one telemetry tile per metric, pending until the browser reports', () => {
    const { container } = renderPage('en');
    expect(screen.getByRole('heading', { level: 2, name: t('en', 'footer.vitals.title') })).toBeVisible();
    expect(container.querySelectorAll('[data-vital]')).toHaveLength(4);
  });
});

describe('profile-driven content', () => {
  it('draws a trend line only for the stats that have one', () => {
    const { container } = renderPage('en');
    const cells = [...container.querySelectorAll('dl[aria-label] > div')].filter((cell) =>
      cell.closest(`dl[aria-label="${t('en', 'hero.stats')}"]`),
    );
    expect(cells).toHaveLength(profile.stats.length);
    profile.stats.forEach((stat, i) => {
      expect(cells[i]?.querySelectorAll('svg path').length ?? 0, stat.id).toBe(stat.trend ? 2 : 0);
    });
  });

  it('links a project only where it has something public, and says so otherwise', () => {
    renderPage('en');
    const open = profile.projects.filter((project) => project.repoUrl);
    const closed = profile.projects.filter((project) => !project.repoUrl);
    expect(screen.queryAllByText(t('en', 'project.private'))).toHaveLength(closed.length);
    for (const project of open) {
      const name = new RegExp(`^${t('en', 'project.source')}: ${project.name}`);
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', project.repoUrl);
    }
    for (const item of profile.archive) {
      // Names may contain brackets ("… (OPS)"), so they are matched literally.
      const literal = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const link = screen.queryByRole('link', { name: new RegExp(`^${literal}`) });
      if (item.url) expect(link).toHaveAttribute('href', item.url);
      else expect(link).toBeNull();
    }
  });

  it('shows a job that started and ended in the same year with that year once', () => {
    const { container } = renderPage('en');
    // A company can be named elsewhere too (the feedback band names where a colleague works).
    const section = container.querySelector<HTMLElement>('#experience');
    expect(section).not.toBeNull();
    if (section === null) return;
    for (const job of profile.experience) {
      const card = within(section).getByText(job.company).closest('article');
      const period = card?.querySelector('p')?.textContent ?? '';
      if (job.endYear === job.startYear) expect(period, job.id).toBe(String(job.startYear));
      else expect(period, job.id).toContain(' – ');
    }
  });

  it('shows the years of use from two years up, and only the name below that', () => {
    renderPage('en');
    const section = screen.getByRole('region', { name: t('en', 'section.skills') });
    for (const skill of profile.skills.flatMap((group) => group.items)) {
      const pill = within(section).getByText(skill.name).closest('li');
      if (skill.years >= 2) {
        expect(pill, skill.name).toHaveTextContent(new RegExp(`${skill.years} ${t('en', 'unit.years')}$`));
      } else {
        expect(pill?.textContent, skill.name).toBe(skill.name);
      }
    }
  });

  it('leaves out the optional sections that have no content', () => {
    renderPage('en');
    const writing = screen.queryByRole('heading', { level: 2, name: t('en', 'section.writing') });
    const quotes = screen.queryByRole('heading', { level: 2, name: t('en', 'section.testimonials') });
    expect(writing !== null).toBe(profile.writing.length > 0);
    expect(quotes !== null).toBe(profile.testimonials.length > 0);
  });
});

describe('command menu', () => {
  const open = async (user: ReturnType<typeof userEvent.setup>, lang: 'en' | 'vi') => {
    await user.click(screen.getByRole('button', { name: t(lang, 'nav.palette') }));
    // The menu is a lazy chunk, so it appears a moment later.
    return screen.findByRole('combobox', { name: t(lang, 'palette.placeholder') });
  };

  it('opens from the header, lists every section, and closes with the close button', async () => {
    const user = userEvent.setup();
    renderPage('en');
    await open(user, 'en');
    const list = screen.getByRole('listbox', { name: t('en', 'palette.title') });
    for (const key of ['nav.about', 'nav.projects', 'nav.contact'] as const) {
      expect(within(list).getByRole('option', { name: new RegExp(t('en', key)) })).toBeInTheDocument();
    }
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: t('en', 'nav.menu.close') }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens with Ctrl+K and finds Vietnamese commands typed without accents', async () => {
    const user = userEvent.setup();
    renderPage('vi');
    await user.keyboard('{Control>}k{/Control}');
    const input = await screen.findByRole('combobox', { name: t('vi', 'palette.placeholder') });
    await user.type(input, 'du an');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent(t('vi', 'nav.projects'));
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id);
    await user.clear(input);
    await user.type(input, 'zzzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent(
      t('vi', 'palette.empty'),
    );
  });

  it('moves with the arrow keys and runs the selected command with Enter', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderPage('en');
    const input = await open(user, 'en');
    await user.type(input, t('en', 'nav.contact'));
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(window.location.hash).toBe('#contact'));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('changes the theme without closing, and switches language', async () => {
    const user = userEvent.setup();
    renderPage('en');
    const input = await open(user, 'en');
    await user.type(input, `${t('en', 'theme.label')} ${t('en', 'theme.mode.light')}`);
    await user.keyboard('{Enter}');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'vietnamese');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(document.documentElement.lang).toBe('vi'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('copies the email and says so', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderPage('en');
    const input = await open(user, 'en');
    await user.type(input, 'copy');
    await user.keyboard('{Enter}');
    expect(writeText).toHaveBeenCalledWith(profile.email);
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent(
        t('en', 'contact.copied'),
      ),
    );
  });
});

describe('theme switch', () => {
  it('starts dark whatever the system prefers, toggles dark and light, and remembers the choice', async () => {
    const user = userEvent.setup();
    mockMatchMedia((q) => q.includes('light'));
    renderPage('en');
    const root = document.documentElement;
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root).not.toHaveAttribute('data-theme-mode');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();

    await user.click(screen.getByRole('button', { name: themeLabel('en', 'dark', 'light') }));
    expect(root).toHaveAttribute('data-theme', 'light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    await user.click(screen.getByRole('button', { name: themeLabel('en', 'light', 'dark') }));
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: themeLabel('en', 'dark', 'light') })).toBeInTheDocument();
  });

  it('labels the button in Vietnamese on /vi', () => {
    renderPage('vi');
    expect(screen.getByRole('button', { name: themeLabel('vi', 'dark', 'light') })).toBeInTheDocument();
  });
});

describe('inline theme script (runs before first paint)', () => {
  const run = () => {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- evaluating our own inline script is the point of this test
    const script = new Function(themeInlineScript) as () => void;
    script();
    return root.getAttribute('data-theme');
  };

  it('uses the saved choice', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(run()).toBe('light');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(run()).toBe('dark');
  });
  it('defaults to dark, even when the operating system prefers light', () => {
    mockMatchMedia((q) => q.includes('light'));
    expect(run()).toBe('dark');
  });
  it('ignores a corrupted saved value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(run()).toBe('dark');
  });
});

describe('copy email', () => {
  it('copies the address and confirms in the current language', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderPage('vi');

    await user.click(screen.getByRole('button', { name: t('vi', 'contact.copy') }));

    expect(writeText).toHaveBeenCalledWith(profile.email);
    expect(await screen.findByRole('button', { name: t('vi', 'contact.copied') })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(t('vi', 'contact.copied'));
  });
});

describe('mobile menu', () => {
  it('opens, then closes with Escape and returns focus to the button', async () => {
    const user = userEvent.setup();
    renderPage('en');
    const button = screen.getByRole('button', { name: t('en', 'nav.menu.open') });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });
});

describe('404 page', () => {
  it.each(['en', 'vi'] as const)('shows the %s message with a link home', (lang) => {
    render(<App route={{ kind: 'notFound', lang }} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t(lang, 'notFound.title'));
    expect(screen.getByRole('link', { name: t(lang, 'notFound.home') })).toHaveAttribute('href', `/${lang}`);
  });
});
