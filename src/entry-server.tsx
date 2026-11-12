import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { pageTitle, renderHead, type Route } from './seo/head';

export { profile } from './data/profile';
export { notFoundLangInlineScript, redirectInlineScript } from './i18n/inline-scripts';
export { LANGS } from './i18n/types';
export { siteUrl } from './seo/siteUrl';
export { themeInlineScript } from './theme/theme-script';

export interface RenderResult {
  /** Markup for <div id="root">. */
  html: string;
  /** Route-specific tags for <head>. */
  head: string;
  title: string;
}

/** Called by scripts/prerender.mjs for every static route. */
export function render(route: Route): RenderResult {
  const html = renderToString(
    <StrictMode>
      <App route={route} />
    </StrictMode>,
  );
  return { html, head: renderHead(route), title: pageTitle(route) };
}
