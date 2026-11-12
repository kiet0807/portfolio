import { describe, expect, it } from 'vitest';
import { matchesQuery, normalizeText } from '@/lib/search';

describe('normalizeText', () => {
  it('lower-cases and strips Vietnamese diacritics', () => {
    expect(normalizeText('Dự án')).toBe('du an');
    expect(normalizeText('  Liên hệ ')).toBe('lien he');
    expect(normalizeText('Đổi giao diện')).toBe('doi giao dien');
    expect(normalizeText('Kỹ năng')).toBe('ky nang');
  });
});

describe('matchesQuery', () => {
  it('matches everything for an empty query', () => {
    expect(matchesQuery('', 'anything')).toBe(true);
    expect(matchesQuery('   ', 'anything')).toBe(true);
  });
  it('needs every word, in any order, without caring about accents or case', () => {
    expect(matchesQuery('an du', 'Dự án')).toBe(true);
    expect(matchesQuery('DU AN', 'Dự án')).toBe(true);
    expect(matchesQuery('du lich', 'Dự án')).toBe(false);
  });
  it('finds an accented query in unaccented text too', () => {
    expect(matchesQuery('liên hệ', 'lien he email')).toBe(true);
  });
});
