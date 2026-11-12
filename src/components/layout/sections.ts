import { ARTICLES } from '@/content/articles';
import { profile } from '@/data/profile';
import type { DictKey } from '@/i18n/dictionary';

interface SectionEntry {
  readonly id: string;
  readonly key: DictKey;
}

/** Articles on this site, or talks and articles published elsewhere. */
export const HAS_WRITING = ARTICLES.length > 0 || profile.writing.length > 0;

const ALL_SECTIONS: readonly (SectionEntry & { readonly enabled: boolean })[] = [
  { id: 'about', key: 'nav.about', enabled: true },
  { id: 'skills', key: 'nav.skills', enabled: true },
  { id: 'experience', key: 'nav.experience', enabled: true },
  { id: 'projects', key: 'nav.projects', enabled: true },
  // Optional: disappears from the page and the navigation when there is nothing to list.
  { id: 'writing', key: 'nav.writing', enabled: HAS_WRITING },
  { id: 'contact', key: 'nav.contact', enabled: true },
];

/** The numbered sections of the page, in order. Drives the navigation and the section numbers. */
export const SECTIONS: readonly SectionEntry[] = ALL_SECTIONS.filter((section) => section.enabled);

export const SECTION_IDS: readonly string[] = SECTIONS.map((s) => s.id);

/** Hero section id; also the target of the logo link. */
export const TOP_ID = 'top';
