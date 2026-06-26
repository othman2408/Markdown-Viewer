import { describe, expect, it } from 'vitest';
import { countWordsFast, getDocumentStats } from '../../../lib/editor/stats';

describe('editor stats', () => {
  it('matches the whitespace word counter behavior', () => {
    expect(countWordsFast('')).toBe(0);
    expect(countWordsFast('one two')).toBe(2);
    expect(countWordsFast(' one\t two\nthree\u00a0four ')).toBe(4);
  });

  it('calculates character, word, and reading-time totals', () => {
    const stats = getDocumentStats('one two three');

    expect(stats.charCount).toBe(13);
    expect(stats.wordCount).toBe(3);
    expect(stats.readingTimeMinutes).toBe(1);
  });
});
