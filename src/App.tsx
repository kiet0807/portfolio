import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { LangProvider } from '@/i18n/LangContext';
import { NotFound } from '@/pages/NotFound';
import { Page } from '@/pages/Page';
import type { Route } from '@/seo/head';

interface AppProps {
  route: Route;
}

export function App({ route }: AppProps) {
  const notFound = route.kind === 'notFound';
  return (
    // LazyMotion + `m` components keep the animation runtime small; `strict` forbids
    // accidentally importing the full `motion` component.
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <LangProvider initialLang={route.lang} notFound={notFound}>
          {notFound ? <NotFound /> : <Page />}
        </LangProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
