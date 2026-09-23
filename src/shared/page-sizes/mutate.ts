import {
  MAX_OPTION_COUNT,
  MIN_OPTION_COUNT,
} from '~/shared/zod-schemas/page-size';
import type { PageSizeTableConfig } from './types';

/**
 * Editor state. Option values are strings, not numbers, because they are bound
 * to text inputs and legitimately pass through '' and partial numbers while
 * the admin types. Zod parses at submit; save stays disabled until then.
 *
 * The default is tracked BY VALUE rather than by a synthetic row id — values
 * are unique within any valid state, so the value identifies the row. The two
 * mutation paths below are what keep that identity intact: without them,
 * editing or removing the default row leaves `defaultValue` pointing at a row
 * that no longer exists.
 */
export type DraftConfig = {
  options: string[];
  defaultValue: string;
};

/** '' parses to 0, not NaN, so an empty row would otherwise win Math.min and
 * pass the finite check. Screen it out explicitly. */
const toNumbers = (values: string[]) =>
  values
    .filter((value) => value.trim() !== '')
    .map(Number)
    .filter((value) => Number.isInteger(value));

/** An empty field is not the number zero. Yield NaN so the schema rejects it
 * rather than silently submitting 0. */
const parseValue = (value: string) =>
  value.trim() === '' ? Number.NaN : Number(value);

export function toDraft(config: PageSizeTableConfig): DraftConfig {
  return {
    options: config.options.map(String),
    defaultValue: String(config.defaultValue),
  };
}

export function fromDraft(draft: DraftConfig) {
  return {
    options: draft.options.map(parseValue).sort((a, b) => a - b),
    defaultValue: parseValue(draft.defaultValue),
  };
}

export function setOptionValue(
  draft: DraftConfig,
  index: number,
  nextValue: string,
): DraftConfig {
  const previousValue = draft.options[index];
  const options = draft.options.map((value, i) =>
    i === index ? nextValue : value,
  );

  return {
    options,
    // The edited row was the default, so the default follows it.
    defaultValue:
      previousValue === draft.defaultValue ? nextValue : draft.defaultValue,
  };
}

export function removeOption(draft: DraftConfig, index: number): DraftConfig {
  if (draft.options.length <= MIN_OPTION_COUNT) return draft;

  const removedValue = draft.options[index];
  const options = draft.options.filter((_, i) => i !== index);
  if (removedValue !== draft.defaultValue) {
    return { options, defaultValue: draft.defaultValue };
  }

  // The default was removed; hand it to the smallest remaining option.
  // Unparseable rows (mid-edit '' or '4x') cannot be a default, so skip them —
  // and if every remaining row is unparseable, keep the field empty and let
  // validation block the save.
  const parsed = toNumbers(options);
  return {
    options,
    defaultValue: parsed.length > 0 ? String(Math.min(...parsed)) : '',
  };
}

export function addOption(draft: DraftConfig): DraftConfig {
  if (draft.options.length >= MAX_OPTION_COUNT) return draft;
  return { ...draft, options: [...draft.options, ''] };
}

export function setDefaultOption(
  draft: DraftConfig,
  index: number,
): DraftConfig {
  const value = draft.options[index];
  if (value === undefined) return draft;
  return { ...draft, defaultValue: value };
}
