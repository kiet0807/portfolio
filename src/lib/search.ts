/**
 * Lower-case and strip diacritics, so that "du an" finds "Dự án" and "lien he"
 * finds "Liên hệ". "đ" is a letter of its own (not a combining mark), hence the
 * explicit replacement.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

/** True when every word of `query` occurs somewhere in `haystack`. An empty query matches. */
export function matchesQuery(query: string, haystack: string): boolean {
  const target = normalizeText(haystack);
  return normalizeText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => target.includes(word));
}
