import { profile } from '@/data/profile';
import { useClock } from '@/hooks/useClock';

/**
 * Live wall-clock time in the profile's time zone, e.g. "14:32 GMT+7".
 * Unknown until the page runs in a browser; the placeholder keeps the width.
 */
export function LocalTime({ className }: { className?: string }) {
  const clock = useClock(profile.timeZone);
  return (
    <span data-clock="" className={className}>
      {clock ?? '--:-- GMT'}
    </span>
  );
}
