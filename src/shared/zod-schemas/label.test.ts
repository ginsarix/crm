import { describe, expect, it } from 'vitest';
import { LabelUpdateSchema } from './label';

describe('LabelUpdateSchema', () => {
  it('accepts a known editable key', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'field.customerCard.name': 'Firma Adı' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts null as a reset', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'field.customerCard.name': null },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a key outside the registry', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'field.customerCard.nope': 'x' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a key that exists but is not editable', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'entity.user.singular': 'Hesap' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a value over the length limit', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'field.customerCard.name': 'x'.repeat(61) },
    });
    expect(result.success).toBe(false);
  });
});
