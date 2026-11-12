import type { Lang } from '@/i18n/types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** "2026-11-12" → "November 12, 2026" / "12 tháng 11, 2026". Written out, so server and browser agree. */
export function formatDate(date: string, lang: Lang): string {
  const [year, month = 1, day] = date.split('-').map(Number);
  return lang === 'vi' ? `${day} tháng ${month}, ${year}` : `${MONTHS[month - 1]} ${day}, ${year}`;
}
