import { allSkills } from '@/data/profile';

/**
 * Ticker of every skill, running between the hero and the first section.
 * Decorative (the Skills section lists the same items for everyone), so it is
 * hidden from assistive technology. Transform-only animation, paused on hover.
 */
export function TechMarquee() {
  const items = allSkills();
  return (
    <div aria-hidden="true" className="border-y border-line bg-surface/40 py-4 print:hidden">
      <div className="overflow-hidden fade-x">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {/* Two identical halves: sliding by -50% loops seamlessly. */}
          {[0, 1].map((half) => (
            <ul key={half} className="flex shrink-0 items-center">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-6 pr-6 font-mono text-sm whitespace-nowrap text-muted"
                >
                  {item}
                  <span className="text-link">/</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
