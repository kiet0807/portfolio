import { useLang } from '@/i18n/useLang';

/** First Tab stop on every page. Parked above the viewport until it receives focus. */
export function SkipLink() {
  const { t } = useLang();
  return (
    <a
      href="#main"
      className="fixed top-3 left-3 z-[100] -translate-y-[250%] rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-transform duration-200 ease-water focus:translate-y-0 print:hidden"
    >
      {t('skip.content')}
    </a>
  );
}
