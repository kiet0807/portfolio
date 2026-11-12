import { cn } from '@/lib/cn';

/**
 * The guide bot: a round head with a dark visor, two eyes that blink and an antenna.
 * Decorative; whatever uses it carries the accessible name.
 */
export function BotFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn('block', className)}>
      <defs>
        <linearGradient id="bot-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#bcd3ee" />
        </linearGradient>
      </defs>
      {/* Antenna */}
      <path d="M24 10V5" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="4" r="2.2" fill="#22d3ee" className="bot-beacon" />
      {/* Ears */}
      <rect x="4" y="21" width="5" height="10" rx="2.5" fill="#60a5fa" />
      <rect x="39" y="21" width="5" height="10" rx="2.5" fill="#60a5fa" />
      {/* Head and visor */}
      <rect
        x="8"
        y="10"
        width="32"
        height="30"
        rx="13"
        fill="url(#bot-shell)"
        stroke="#60a5fa"
        strokeWidth="1"
      />
      <rect x="12.5" y="17" width="23" height="15" rx="7.5" fill="#0b1f3a" />
      <g className="bot-eyes" fill="#22d3ee">
        <rect x="17.5" y="21" width="4" height="7" rx="2" />
        <rect x="26.5" y="21" width="4" height="7" rx="2" />
      </g>
    </svg>
  );
}
