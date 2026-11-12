import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { loadArticle, type Article } from './content/articles';
import { pathForLang, readStoredLang, resolveInitialLang } from './i18n/lang';
import { resolveRoute } from './routing';
import './styles.css';

function browserLanguages(): readonly string[] {
  return navigator.languages.length > 0 ? navigator.languages : [navigator.language];
}

async function start(): Promise<void> {
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

  // An article page hydrates with the same text it was prerendered from, so fetch it first.
  // If that fails (offline, a deploy replaced the chunk), the prerendered page stays as it is:
  // fully readable, only the theme and language buttons do nothing.
  let article: Article | undefined;
  if (route.kind === 'article') {
    try {
      article = await loadArticle(route.slug, route.lang);
    } catch {
      return;
    }
  }

  const app = (
    <StrictMode>
      <App route={route} article={article} />
    </StrictMode>
  );

  // Prerendered pages are hydrated; the dev server (empty root) renders from scratch.
  if (container.firstElementChild) hydrateRoot(container, app);
  else createRoot(container).render(app);
}

void start();
