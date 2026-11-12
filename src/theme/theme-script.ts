/**
 * Inline script injected into <head> before any stylesheet so the right theme is
 * applied before first paint (no flash of the wrong colours).
 *
 * It sets <html data-theme> to "dark" or "light". Dark is the default for everyone,
 * whatever the operating system prefers; light is used only when the visitor chose it.
 *
 * It also marks the first page view of a browser session with data-first-visit, which
 * is what lets the guide bot fly in from its very first frame (styles.css). Visitors who
 * prefer reduced motion never get the attribute.
 *
 * Kept dependency-free: vite.config.ts injects it and the prerender step hashes it
 * for the Content-Security-Policy.
 */
export const THEME_STORAGE_KEY = 'portfolio:theme';

/** sessionStorage key written once the bot's first-visit flight has started. */
export const VISITED_STORAGE_KEY = 'portfolio:visited';

/** Browser UI colour (address bar) per theme; matches the page background. */
export const THEME_COLOR = { dark: '#0a0f1a', light: '#f8fafc' } as const;

export const themeInlineScript = `(function(){var d=document.documentElement,t='dark';try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='light')t='light'}catch(e){}d.setAttribute('data-theme',t);if(t==='light'){var c=document.querySelector('meta[name="theme-color"]');if(c)c.setAttribute('content','${THEME_COLOR.light}')}try{if(!sessionStorage.getItem('${VISITED_STORAGE_KEY}')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)d.setAttribute('data-first-visit','')}catch(e){}})();`;
