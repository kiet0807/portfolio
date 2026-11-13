import { useId } from 'react';
import type { Project, ProjectVisualKind } from '@/data/profile';
import { cn } from '@/lib/cn';
import { useLang } from '@/i18n/useLang';

/* The "screen" is always dark, in both themes, so these colours are fixed. */
const C = {
  screen: '#0b1626',
  panel: '#12233d',
  rail: '#0f1e36',
  edge: '#1e3a5f',
  ink: '#e6edf5',
  silver: '#c0c7d1',
  primary: '#2563eb',
  accent: '#22d3ee',
} as const;

/** Animations inside the wireframes only run while the card is hovered (see `group` on the card). */
const PULSE = 'origin-center [transform-box:fill-box] group-hover:animate-ping-soft';

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function Dashboard({ id }: { id: string }) {
  const kpis = [70, 178, 286];
  const bars = [30, 52, 40, 70, 58];
  const line = 'M80,150 C100,140 110,120 130,124 S160,100 180,104 S215,80 235,84 S255,70 266,66';
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.accent} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="56" height="190" fill={C.rail} />
      <rect x="14" y="14" width="28" height="8" rx="4" fill={C.primary} />
      {[40, 58, 76, 94].map((y) => (
        <rect key={y} x="14" y={y} width="28" height="6" rx="3" fill={C.silver} opacity="0.18" />
      ))}
      {kpis.map((x, i) => (
        <g key={x}>
          <rect x={x} y="14" width="98" height="40" rx="6" fill={C.panel} />
          <rect x={x + 10} y="23" width="36" height="5" rx="2.5" fill={C.silver} opacity="0.3" />
          <rect x={x + 10} y="36" width="48" height="9" rx="3" fill={C.ink} opacity="0.85" />
          <rect x={x + 66} y="36" width="22" height="9" rx="4.5" fill={i === 1 ? C.primary : C.accent} />
        </g>
      ))}
      <rect x="70" y="64" width="206" height="112" rx="6" fill={C.panel} />
      {[92, 116, 140].map((y) => (
        <path key={y} d={`M80,${String(y)}H266`} stroke={C.silver} strokeOpacity="0.1" />
      ))}
      <path d={`${line} L266,166 L80,166 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
      <circle cx="266" cy="66" r="4" fill={C.accent} className={PULSE} />
      <circle cx="266" cy="66" r="3.5" fill={C.accent} />
      <rect x="286" y="64" width="98" height="112" rx="6" fill={C.panel} />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={298 + i * 16}
          y={166 - h}
          width="9"
          height={h}
          rx="2"
          fill={i === 3 ? C.accent : C.primary}
        />
      ))}
    </>
  );
}

function Components() {
  return (
    <>
      <rect x="16" y="14" width="70" height="7" rx="3.5" fill={C.silver} opacity="0.3" />
      <rect x="16" y="34" width="84" height="26" rx="13" fill={C.primary} />
      <rect x="36" y="44" width="44" height="6" rx="3" fill="#fff" opacity="0.9" />
      <rect x="110.5" y="34.5" width="83" height="25" rx="12.5" fill="none" stroke={C.accent} />
      <rect x="130" y="44" width="44" height="6" rx="3" fill={C.accent} />
      <rect x="206" y="37" width="44" height="20" rx="10" fill={C.accent} />
      <circle cx="240" cy="47" r="7" fill={C.screen} />
      <rect x="260" y="37" width="44" height="20" rx="10" fill={C.edge} />
      <circle cx="270" cy="47" r="7" fill={C.silver} />
      {[C.primary, C.accent, C.silver].map((fill, i) => (
        <circle key={fill} cx={332 + i * 17} cy="47" r="11" fill={fill} stroke={C.screen} strokeWidth="2" />
      ))}

      <rect x="16.5" y="74.5" width="177" height="27" rx="8" fill={C.panel} stroke={C.edge} />
      <rect x="28" y="85" width="60" height="6" rx="3" fill={C.silver} opacity="0.55" />
      <rect x="92" y="81" width="1.5" height="14" fill={C.accent} className="group-hover:animate-blink" />
      <rect x="206.5" y="74.5" width="97" height="27" rx="8" fill={C.panel} stroke={C.edge} />
      <rect x="218" y="85" width="44" height="6" rx="3" fill={C.silver} opacity="0.55" />
      <path d="m284 86 4 4 4-4" fill="none" stroke={C.silver} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="318" y="78" width="20" height="20" rx="5" fill={C.primary} />
      <path d="m323 88 3.5 3.5 6.5-7" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="362" cy="88" r="9.5" fill="none" stroke={C.accent} />
      <circle cx="362" cy="88" r="4.5" fill={C.accent} />

      <path d="M16,126H194" stroke={C.edge} strokeWidth="4" strokeLinecap="round" />
      <path d="M16,126H120" stroke={C.accent} strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="126" r="7" fill={C.ink} />
      {[
        [206, 44],
        [256, 56],
        [318, 40],
      ].map(([x, w]) => (
        <rect key={x} x={x} y="116" width={w} height="20" rx="10" fill={C.panel} stroke={C.edge} />
      ))}

      <rect x="16" y="150" width="178" height="52" rx="8" fill={C.panel} />
      <circle cx="36" cy="170" r="9" fill={C.primary} />
      <rect x="54" y="162" width="90" height="6" rx="3" fill={C.ink} opacity="0.8" />
      <rect x="54" y="174" width="120" height="5" rx="2.5" fill={C.silver} opacity="0.3" />
      <rect x="206" y="152" width="178" height="8" rx="4" fill={C.edge} />
      <rect x="206" y="152" width="112" height="8" rx="4" fill={C.accent} />
      <rect x="206" y="170" width="140" height="5" rx="2.5" fill={C.silver} opacity="0.3" />
    </>
  );
}

function RouteMap() {
  const pins = [
    [150, 150],
    [230, 84],
    [330, 44],
  ] as const;
  return (
    <>
      <path
        d="M120,0 L262,0 C282,40 250,70 270,110 C286,142 250,170 262,190 L150,190 C130,150 162,120 140,90 C124,60 140,30 120,0 Z"
        fill={C.panel}
      />
      <path
        d="M300,20 C340,8 400,30 400,30 L400,124 C370,132 330,112 310,80 C298,60 290,40 300,20 Z"
        fill={C.panel}
      />
      {[38, 76, 114, 152].map((y) => (
        <path key={y} d={`M0,${String(y)}H400`} stroke={C.silver} strokeOpacity="0.07" />
      ))}
      {[160, 240, 320].map((x) => (
        <path key={x} d={`M${String(x)},0V190`} stroke={C.silver} strokeOpacity="0.07" />
      ))}
      <path
        d="M150,150 C180,120 190,90 230,84 S300,70 330,44"
        fill="none"
        stroke={C.accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="2 6"
        className="group-hover:animate-dash"
      />
      <circle cx="330" cy="44" r="7" fill={C.accent} className={PULSE} />
      {pins.map(([cx, cy], i) => (
        <g key={cx}>
          <circle
            cx={cx}
            cy={cy}
            r="7"
            fill={i === 2 ? C.accent : C.primary}
            stroke={C.ink}
            strokeWidth="1.5"
          />
          <circle cx={cx} cy={cy} r="2" fill={i === 2 ? C.screen : '#fff'} />
        </g>
      ))}
      <rect x="12.5" y="14.5" width="104" height="161" rx="8" fill={C.rail} stroke={C.edge} />
      <rect x="24" y="26" width="52" height="7" rx="3.5" fill={C.ink} opacity="0.85" />
      {[52, 84, 116, 148].map((y, i) => (
        <g key={y}>
          <circle cx="32" cy={y} r="7" fill={i === 0 ? C.accent : C.panel} stroke={C.edge} />
          <rect x="46" y={y - 6} width="56" height="5" rx="2.5" fill={C.silver} opacity="0.55" />
          <rect x="46" y={y + 3} width="38" height="4" rx="2" fill={C.silver} opacity="0.25" />
        </g>
      ))}
      <rect x="364.5" y="138.5" width="23" height="40" rx="6" fill={C.rail} stroke={C.edge} />
      <path d="M371,149h10M376,144v10M371,168h10" stroke={C.silver} strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function Generic() {
  return (
    <>
      <rect x="16" y="14" width="40" height="7" rx="3.5" fill={C.accent} />
      {[300, 332, 364].map((x) => (
        <rect key={x} x={x} y="15" width="22" height="5" rx="2.5" fill={C.silver} opacity="0.3" />
      ))}
      <rect x="16" y="40" width="160" height="11" rx="5.5" fill={C.ink} opacity="0.85" />
      <rect x="16" y="60" width="124" height="6" rx="3" fill={C.silver} opacity="0.3" />
      <rect x="16" y="78" width="66" height="22" rx="11" fill={C.primary} />
      <rect x="220" y="34" width="164" height="70" rx="8" fill={C.panel} />
      <path d="M232,96 268,62 292,82 318,54 372,96 Z" fill={C.accent} opacity="0.4" />
      <circle cx="358" cy="50" r="7" fill={C.accent} />
      {[16, 143, 270].map((x) => (
        <g key={x}>
          <rect x={x} y="120" width="114" height="80" rx="8" fill={C.panel} />
          <rect x={x + 12} y="134" width="60" height="6" rx="3" fill={C.ink} opacity="0.7" />
          <rect x={x + 12} y="148" width="88" height="5" rx="2.5" fill={C.silver} opacity="0.25" />
          <rect x={x + 12} y="160" width="72" height="5" rx="2.5" fill={C.silver} opacity="0.25" />
        </g>
      ))}
    </>
  );
}

function Wireframe({ kind }: { kind: ProjectVisualKind }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 400 190" className="block h-auto w-full" focusable="false">
      <rect width="400" height="190" fill={C.screen} />
      {kind === 'dashboard' ? <Dashboard id={gradientId} /> : null}
      {kind === 'components' ? <Components /> : null}
      {kind === 'map' ? <RouteMap /> : null}
      {kind === 'generic' ? <Generic /> : null}
    </svg>
  );
}

/**
 * Top of a project card: a small browser window showing either a real screenshot
 * (`project.image`) or one of the built-in wireframes (`project.visual`).
 * Wireframes are decorative and hidden from assistive technology.
 */
export function ProjectVisual({ project, className }: { project: Project; className?: string }) {
  const { lang } = useLang();
  const { image } = project;
  return (
    <div
      aria-hidden={image ? undefined : true}
      className={cn(
        'relative overflow-hidden border-b border-line bg-linear-to-br from-navy via-[#0f2a55] to-[#0c3d5e] px-4 pt-4 print:hidden',
        className,
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 tech-grid opacity-70" />
      <div className="relative overflow-hidden rounded-t-lg border border-b-0 border-white/15 shadow-[0_-8px_30px_-12px_rgb(34_211_238/0.35)] transition-transform duration-500 ease-water group-hover:-translate-y-1">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#101f35] px-3 py-2">
          <span className="size-2 rounded-full bg-white/25" />
          <span className="size-2 rounded-full bg-white/25" />
          <span className="size-2 rounded-full bg-white/25" />
          <span className="ml-2 truncate rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-[#a3b1c2]">
            {project.demoUrl ? hostOf(project.demoUrl) : project.name.toLowerCase()}
          </span>
        </div>
        {image ? (
          <img
            src={image.src}
            alt={image.alt[lang]}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
            className="block aspect-[400/190] w-full object-cover object-top"
          />
        ) : (
          <Wireframe kind={project.visual ?? 'generic'} />
        )}
      </div>
    </div>
  );
}
