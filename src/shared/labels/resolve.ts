import {
  entities,
  fields,
  pages,
  sections,
  systemFieldLabels,
} from './registry';
import type {
  EntityKey,
  EntityLabels,
  FieldEntityKey,
  PageKey,
  ResolvedLabels,
  SectionKey,
} from './types';
import {
  entityLabelKey,
  fieldLabelKey,
  pageLabelKey,
  sectionLabelKey,
} from './types';

const FIELD_ENTITY_KEYS: FieldEntityKey[] = [
  'customerCard',
  'visit',
  'businessGroupCard',
];

/** An override only counts if it has non-whitespace content. */
const pick = (override: string | undefined, fallback: string) => {
  const trimmed = override?.trim();
  return trimmed ? trimmed : fallback;
};

export const editableLabelKeys: ReadonlySet<string> = new Set([
  ...Object.entries(entities)
    .filter(([, entity]) => entity.editable)
    .flatMap(([key]) => [
      entityLabelKey(key as EntityKey, 'singular'),
      entityLabelKey(key as EntityKey, 'plural'),
    ]),
  ...FIELD_ENTITY_KEYS.flatMap((entity) =>
    fields[entity]
      .filter((field) => field.kind === 'editable')
      .map((field) => fieldLabelKey(entity, field.key)),
  ),
  ...Object.keys(sections).map((key) => sectionLabelKey(key as SectionKey)),
  ...Object.entries(pages)
    .filter(([, page]) => page.editable)
    .map(([key]) => pageLabelKey(key as PageKey)),
]);

export const defaultLabelValues: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(entities)
      .filter(([, entity]) => entity.editable)
      .flatMap(([key, entity]) => [
        [entityLabelKey(key as EntityKey, 'singular'), entity.singular],
        [entityLabelKey(key as EntityKey, 'plural'), entity.plural],
      ]),
  ),
  ...Object.fromEntries(
    FIELD_ENTITY_KEYS.flatMap((entity) =>
      fields[entity]
        .filter((field) => field.kind === 'editable')
        .map((field) => [fieldLabelKey(entity, field.key), field.default]),
    ),
  ),
  ...Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [
      sectionLabelKey(key as SectionKey),
      value,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(pages)
      .filter(([, page]) => page.editable)
      .map(([key, page]) => [pageLabelKey(key as PageKey), page.title]),
  ),
};

export function resolveLabels(
  overrides: Record<string, string>,
): ResolvedLabels {
  /** Only keys the registry marks editable may be overridden. */
  const override = (key: string) =>
    editableLabelKeys.has(key) ? overrides[key] : undefined;

  const entity = {} as Record<EntityKey, EntityLabels>;
  for (const [key, definition] of Object.entries(entities)) {
    const entityKey = key as EntityKey;
    entity[entityKey] = {
      singular: pick(
        override(entityLabelKey(entityKey, 'singular')),
        definition.singular,
      ),
      plural: pick(
        override(entityLabelKey(entityKey, 'plural')),
        definition.plural,
      ),
    };
  }

  // Built as a loose record because the two passes below key in by runtime
  // string, then cast once at the return. FieldLabels' precise unions are what
  // every consumer sees.
  const field = {} as Record<FieldEntityKey, Record<string, string>>;

  // Pass 1: editable fields. Pass 2 reads these, so it must come first.
  for (const entityKey of FIELD_ENTITY_KEYS) {
    const resolved: Record<string, string> = {};
    for (const definition of fields[entityKey]) {
      if (definition.kind === 'editable') {
        resolved[definition.key] = pick(
          override(fieldLabelKey(entityKey, definition.key)),
          definition.default,
        );
      }
    }
    field[entityKey] = resolved;
  }

  // Pass 2: inherited and composed fields.
  for (const entityKey of FIELD_ENTITY_KEYS) {
    for (const definition of fields[entityKey]) {
      if (definition.kind === 'inherited') {
        field[entityKey][definition.key] = entity[definition.from].singular;
      }
      if (definition.kind === 'composed') {
        const sourceEntity = entity[definition.fromEntity].singular;
        const sourceField =
          field[definition.fromEntity as FieldEntityKey][definition.fromField];
        field[entityKey][definition.key] = `${sourceEntity} ${sourceField}`;
      }
    }
  }

  const section = {} as Record<SectionKey, string>;
  for (const [key, value] of Object.entries(sections)) {
    const sectionKey = key as SectionKey;
    section[sectionKey] = pick(override(sectionLabelKey(sectionKey)), value);
  }

  const page = {} as Record<PageKey, string>;
  for (const [key, definition] of Object.entries(pages)) {
    const pageKey = key as PageKey;
    page[pageKey] = pick(override(pageLabelKey(pageKey)), definition.title);
  }

  return {
    entity,
    field: field as ResolvedLabels['field'],
    section,
    page,
    system: systemFieldLabels,
  };
}

export const DEFAULT_LABELS: ResolvedLabels = resolveLabels({});

/** Every editable key mapped to its current value. Mirror of defaultLabelValues. */
export function labelValues(labels: ResolvedLabels): Record<string, string> {
  const values: Record<string, string> = {};

  for (const key of Object.keys(entities)) {
    const entityKey = key as EntityKey;
    values[entityLabelKey(entityKey, 'singular')] =
      labels.entity[entityKey].singular;
    values[entityLabelKey(entityKey, 'plural')] =
      labels.entity[entityKey].plural;
  }

  for (const entityKey of FIELD_ENTITY_KEYS) {
    const resolved = labels.field[entityKey] as Record<string, string>;
    for (const definition of fields[entityKey]) {
      values[fieldLabelKey(entityKey, definition.key)] = resolved[
        definition.key
      ] as string;
    }
  }

  for (const key of Object.keys(sections)) {
    values[sectionLabelKey(key as SectionKey)] =
      labels.section[key as SectionKey];
  }

  for (const key of Object.keys(pages)) {
    values[pageLabelKey(key as PageKey)] = labels.page[key as PageKey];
  }

  return Object.fromEntries(
    Object.entries(values).filter(([key]) => editableLabelKeys.has(key)),
  );
}

/**
 * Look a field label up by a runtime string key. Filter controls iterate
 * `columnMap` keys as plain strings, which the precise unions would reject,
 * and those lists include the three system keys.
 */
export function fieldLabel(
  labels: ResolvedLabels,
  entity: FieldEntityKey,
  key: string,
): string {
  const entityFields = labels.field[entity] as Record<
    string,
    string | undefined
  >;
  const system = labels.system as Record<string, string | undefined>;
  return entityFields[key] ?? system[key] ?? key;
}
