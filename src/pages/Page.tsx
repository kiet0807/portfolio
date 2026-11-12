import { lazy, Suspense } from 'react';
import { Assistant } from '@/components/assistant/Assistant';
import { Hero } from '@/components/hero/Hero';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { SectionRail } from '@/components/layout/SectionRail';
import { SECTION_IDS, TOP_ID } from '@/components/layout/sections';
import { SkipLink } from '@/components/layout/SkipLink';
import { StatusBar } from '@/components/layout/StatusBar';
import { About } from '@/components/sections/About';
import { Contact } from '@/components/sections/Contact';
import { Experience } from '@/components/sections/Experience';
import { Projects } from '@/components/sections/Projects';
import { Skills } from '@/components/sections/Skills';
import { TechMarquee } from '@/components/sections/TechMarquee';
import { Testimonials } from '@/components/sections/Testimonials';
import { Writing } from '@/components/sections/Writing';
import { profile } from '@/data/profile';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useCommandMenu } from '@/hooks/useCommandMenu';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useLangSwitch } from '@/i18n/useLangSwitch';

// Downloaded the first time the command menu is opened; never part of the initial bundle.
const CommandPalette = lazy(() => import('@/components/layout/CommandPalette'));

export function Page() {
  const activeId = useActiveSection(SECTION_IDS, TOP_ID);
  const switchLang = useLangSwitch();
  const menu = useCommandMenu();
  useSpotlight();
  return (
    <>
      <SkipLink />
      <Header activeId={activeId} onSwitchLang={switchLang} onOpenMenu={menu.show} />
      <main id="main" tabIndex={-1} className="relative isolate outline-none">
        {/* Night sky behind every section; it drifts a little as the page scrolls (styles.css). */}
        <div aria-hidden="true" className="starfield print:hidden forced-colors:hidden" />
        <Hero />
        <TechMarquee />
        <About />
        <Skills />
        <Experience />
        <Projects />
        {profile.writing.length > 0 ? <Writing /> : null}
        {profile.testimonials.length > 0 ? <Testimonials /> : null}
        <Contact />
      </main>
      <Footer />
      <Assistant />
      <SectionRail activeId={activeId} />
      <StatusBar activeId={activeId} onOpenMenu={menu.show} />
      {menu.open ? (
        <Suspense fallback={null}>
          <CommandPalette onClose={menu.hide} onSwitchLang={switchLang} />
        </Suspense>
      ) : null}
    </>
  );
}
