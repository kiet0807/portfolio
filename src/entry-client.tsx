import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { pathForLang, readStoredLang, resolveInitialLang } from './i18n/lang';
import { resolveRoute } from './routing';
import './styles.css';

function browserLanguages(): readonly string[] {
  return navigator.languages.length > 0 ? navigator.languages : [navigator.language];
}

function start(): void {
  const container = document.getElementById('root');
  if (!container) return;

  const stored = readStoredLang();
  const { pathname, search, hash } = window.location;

  // In production `/` is a static redirect page that never loads this bundle;
  // this branch only matters for the dev server.
  if (pathname === '/') {
    const lang = resolveInitialLang({ stored, browserLanguages: browserLanguages() });
    window.location.replace(pathForLang(lang) + search + hash);
    return;
  }

  const route = resolveRoute({ pathname, stored, browserLanguages: browserLanguages() });
  const app = (
    <StrictMode>
      <App route={route} />
    </StrictMode>
  );

  // Prerendered pages are hydrated; the dev server (empty root) renders from scratch.
  if (container.firstElementChild) hydrateRoot(container, app);
  else createRoot(container).render(app);
}

start();
