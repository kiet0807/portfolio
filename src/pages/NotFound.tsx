import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';
import { ButtonLink } from '@/components/ui/Button';
import { useLang } from '@/i18n/useLang';

export function NotFound() {
  const { lang, setLang, t } = useLang();
  return (
    <>
      <SkipLink />
      <Header activeId={null} onSwitchLang={setLang} minimal />
      <main
        id="main"
        tabIndex={-1}
        className="container-x flex min-h-svh flex-col items-center justify-center pt-24 pb-16 text-center outline-none"
      >
        {/* The waves and the boat are animated with CSS inside the SVG (disabled for reduced motion). */}
        <img
          src="/404-illustration.svg"
          alt=""
          width={640}
          height={360}
          className="h-auto w-full max-w-xl rounded-3xl shadow-card"
        />
        <h1 className="mt-10 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          <span className="sr-only">404. </span>
          {t('notFound.title')}
        </h1>
        <p className="mt-4 max-w-md text-base text-pretty text-muted sm:text-lg">{t('notFound.body')}</p>
        <ButtonLink href={`/${lang}`} className="mt-8">
          {t('notFound.home')}
        </ButtonLink>
      </main>
    </>
  );
}
