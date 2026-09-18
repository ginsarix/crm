import { describe, expect, it } from 'vitest';
import {
  ElectionResultUpdateSchema,
  electionResultCountKeys,
} from './election-result';

const base = {
  id: 'abc',
  toplamOy: 0,
  kullanilanOy: 0,
  gecerliOy: 0,
  meclisUyeSayisi: 0,
  yesil: 0,
  mavi: 0,
  turuncu: 0,
};

describe('ElectionResultUpdateSchema', () => {
  it('lists all seven count fields', () => {
    expect(electionResultCountKeys).toHaveLength(7);
  });

  it('coerces an empty string to zero', () => {
    const result = ElectionResultUpdateSchema.parse({ ...base, yesil: '' });
    expect(result.yesil).toBe(0);
  });

  it('coerces null and undefined to zero', () => {
    expect(ElectionResultUpdateSchema.parse({ ...base, mavi: null }).mavi).toBe(
      0,
    );
    expect(
      ElectionResultUpdateSchema.parse({ ...base, turuncu: undefined }).turuncu,
    ).toBe(0);
  });

  it('coerces a numeric string to a number', () => {
    expect(
      ElectionResultUpdateSchema.parse({ ...base, toplamOy: '42' }).toplamOy,
    ).toBe(42);
  });

  it('accepts a fully blank row', () => {
    const blank = Object.fromEntries(
      electionResultCountKeys.map((key) => [key, '']),
    );
    const result = ElectionResultUpdateSchema.parse({ id: 'abc', ...blank });
    for (const key of electionResultCountKeys) {
      expect(result[key]).toBe(0);
    }
  });

  it('accepts large values — there is no upper bound', () => {
    expect(
      ElectionResultUpdateSchema.parse({ ...base, toplamOy: 9_999_999 })
        .toplamOy,
    ).toBe(9_999_999);
  });

  it('rejects a negative count with a Turkish message', () => {
    const result = ElectionResultUpdateSchema.safeParse({
      ...base,
      gecerliOy: -1,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('0 veya daha büyük olmalı');
  });

  it('rejects a non-integer count with a Turkish message', () => {
    const result = ElectionResultUpdateSchema.safeParse({
      ...base,
      gecerliOy: 1.5,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Tam sayı olmalı');
  });

  it('rejects text that is not a number with a Turkish message', () => {
    const result = ElectionResultUpdateSchema.safeParse({
      ...base,
      gecerliOy: 'abc',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Sayı olmalı');
  });

  it('rejects a count above the Postgres Int32 max with a Turkish message', () => {
    const result = ElectionResultUpdateSchema.safeParse({
      ...base,
      toplamOy: 2_147_483_648,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Çok büyük bir sayı');
  });

  it('accepts exactly the Postgres Int32 max', () => {
    const result = ElectionResultUpdateSchema.parse({
      ...base,
      toplamOy: 2_147_483_647,
    });
    expect(result.toplamOy).toBe(2_147_483_647);
  });

  it('applies no cross-field constraints', () => {
    // Kullanılan Oy exceeding Toplam Oy is accepted on purpose.
    expect(() =>
      ElectionResultUpdateSchema.parse({
        ...base,
        toplamOy: 10,
        kullanilanOy: 99,
      }),
    ).not.toThrow();
  });
});
