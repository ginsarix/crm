import { describe, expect, it } from 'vitest';
import { PageSizeTableConfigSchema } from './page-size';

const config = (options: number[], defaultValue: number) => ({
  options,
  defaultValue,
});

describe('PageSizeTableConfigSchema', () => {
  it('accepts a single option', () => {
    expect(PageSizeTableConfigSchema.safeParse(config([25], 25)).success).toBe(
      true,
    );
  });

  it('accepts five options', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([1, 2, 3, 4, 5], 3)).success,
    ).toBe(true);
  });

  it('rejects zero options', () => {
    expect(PageSizeTableConfigSchema.safeParse(config([], 25)).success).toBe(
      false,
    );
  });

  it('rejects six options', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([1, 2, 3, 4, 5, 6], 3))
        .success,
    ).toBe(false);
  });

  it('rejects duplicate values', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([25, 50, 25], 25)).success,
    ).toBe(false);
  });

  it('accepts the boundary values 1 and 500', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([1, 500], 1)).success,
    ).toBe(true);
  });

  it('rejects 0 and 501', () => {
    expect(PageSizeTableConfigSchema.safeParse(config([0], 0)).success).toBe(
      false,
    );
    expect(
      PageSizeTableConfigSchema.safeParse(config([501], 501)).success,
    ).toBe(false);
  });

  it('rejects a non-integer value', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([25.5], 25.5)).success,
    ).toBe(false);
  });

  it('rejects a default that is not among the options', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([25, 50], 100)).success,
    ).toBe(false);
  });

  it("accepts options in descending order (sorting is the router's job)", () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([500, 25], 25)).success,
    ).toBe(true);
  });
});
