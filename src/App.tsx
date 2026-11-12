import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import type { Article } from '@/content/articles';
import { LangProvider } from '@/i18n/LangContext';
import { ArticlePage } from '@/pages/ArticlePage';
import { NotFound } from '@/pages/NotFound';
import { Page } from '@/pages/Page';
import type { Route } from '@/seo/head';

interface AppProps {
  route: Route;
  /** The parsed article, loaded before rendering when `route` is an article. */
  article?: Article;
}

export function App({ route, article }: AppProps) {
  const content =
    route.kind === 'page' ? (
      <Page />
    ) : route.kind === 'article' && article ? (
      <ArticlePage article={article} />
    ) : (
      <NotFound />
    );
  return (
    // LazyMotion + `m` components keep the animation runtime small; `strict` forbids
    // accidentally importing the full `motion` component.
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <LangProvider route={route}>{content}</LangProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
