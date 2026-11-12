import { Decode } from './Decode';

interface SectionHeadingProps {
  id: string;
  kicker: string;
  title: string;
  /** Position of the section on the page (1-based), shown as "01". */
  index: number;
}

export function SectionHeading({ id, kicker, title, index }: SectionHeadingProps) {
  const number = String(index).padStart(2, '0');
  return (
    <div className="mb-10 sm:mb-14 print:mb-3 print:break-inside-avoid print:break-after-avoid">
      <div className="flex items-end justify-between gap-6 print:block">
        <div className="max-w-2xl">
          <p className="mb-2 flex items-center gap-2.5 text-sm font-medium tracking-wide text-link uppercase">
            <span aria-hidden="true" className="font-mono text-muted print:hidden">
              {number}
            </span>
            <span aria-hidden="true" className="h-px w-6 bg-link/60 print:hidden" />
            <Decode text={kicker} />
          </p>
          <h2
            id={id}
            className="text-4xl font-light tracking-tight text-balance sm:text-5xl lg:text-6xl print:text-3xl print:font-bold"
          >
            {title}
          </h2>
        </div>
        {/* The big outlined numeral is drawn by CSS from data-index (see styles.css). */}
        <div
          aria-hidden="true"
          data-index={number}
          className="section-numeral hidden shrink-0 select-none sm:block print:hidden forced-colors:hidden"
        />
      </div>
      <div aria-hidden="true" className="relative mt-6 h-px bg-line print:hidden">
        <span className="absolute -top-px left-0 h-[3px] w-16 rounded-full bg-linear-to-r from-primary to-accent" />
        <span className="absolute -top-1 right-0 h-[9px] w-px bg-muted/60" />
      </div>
    </div>
  );
}
