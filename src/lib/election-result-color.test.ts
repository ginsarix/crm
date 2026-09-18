import { describe, expect, it } from 'vitest';
import { resolveElectionRowColor } from './election-result-color';

describe('resolveElectionRowColor', () => {
  it('colors the row for a single leader', () => {
    expect(resolveElectionRowColor(10, 5, 3)).toBe('green');
    expect(resolveElectionRowColor(5, 10, 3)).toBe('blue');
    expect(resolveElectionRowColor(5, 3, 10)).toBe('orange');
  });

  it('returns purple for any tie at the top', () => {
    expect(resolveElectionRowColor(10, 10, 3)).toBe('purple');
    expect(resolveElectionRowColor(10, 3, 10)).toBe('purple');
    expect(resolveElectionRowColor(3, 10, 10)).toBe('purple');
    expect(resolveElectionRowColor(7, 7, 7)).toBe('purple');
  });

  it('ignores a tie that is not for the maximum', () => {
    expect(resolveElectionRowColor(9, 4, 4)).toBe('green');
  });

  it('returns null when every count is zero', () => {
    expect(resolveElectionRowColor(0, 0, 0)).toBeNull();
  });

  it('still colors a row whose leader is the only non-zero count', () => {
    expect(resolveElectionRowColor(0, 1, 0)).toBe('blue');
  });
});
