import { describe, expect, it } from 'vitest';
import { localNumber } from '@/lib/number';

describe('localNumber', () => {
  it('uses a decimal comma in Vietnamese only', () => {
    expect(localNumber('1.6k', 'vi')).toBe('1,6k');
    expect(localNumber('1.6k', 'en')).toBe('1.6k');
  });

  it.each(['14 + 3', '−50%', '≈80%', '800+', '0'])('leaves "%s" alone', (text) => {
    expect(localNumber(text, 'vi')).toBe(text);
  });
});
