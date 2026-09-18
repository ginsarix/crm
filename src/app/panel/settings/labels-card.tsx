'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useLabels } from '~/hooks/use-labels';
import { labelCompose } from '~/shared/labels/compose';
import {
  entities,
  fields,
  sectionOrder,
  sections,
} from '~/shared/labels/registry';
import { defaultLabelValues, labelValues } from '~/shared/labels/resolve';
import type {
  EntityKey,
  FieldDefinition,
  FieldEntityKey,
  PageKey,
} from '~/shared/labels/types';
import {
  entityLabelKey,
  fieldLabelKey,
  pageLabelKey,
  sectionLabelKey,
} from '~/shared/labels/types';
import { api } from '~/trpc/react';
import { LabelFieldRow } from './label-field-row';

/**
 * Turkish ablative suffixes vary by vowel, so the three that actually occur are
 * written out rather than generated from the entity name.
 */
const SOURCE_BADGE: Partial<Record<EntityKey, string>> = {
  businessGroup: 'Meslek Grubundan',
  salesRepresentative: 'Satış Temsilcisinden',
  customerCard: 'Cari Kartından',
};

type TabDefinition = {
  id: string;
  staticTitle?: string;
  titleEntity?: EntityKey;
  entityKeys: EntityKey[];
  fieldEntity?: FieldEntityKey;
  showSections?: boolean;
  pageKeys?: PageKey[];
};

const TABS: TabDefinition[] = [
  {
    id: 'customerCard',
    titleEntity: 'customerCard',
    entityKeys: ['customerCard'],
    fieldEntity: 'customerCard',
  },
  {
    id: 'visit',
    titleEntity: 'visit',
    entityKeys: ['visit'],
    fieldEntity: 'visit',
  },
  {
    id: 'businessGroupCard',
    titleEntity: 'businessGroupCard',
    entityKeys: ['businessGroupCard'],
    fieldEntity: 'businessGroupCard',
    showSections: true,
  },
  {
    id: 'genel',
    staticTitle: 'Genel',
    entityKeys: ['businessGroup', 'salesRepresentative'],
    pageKeys: ['dashboard', 'settings'],
  },
];

/** Every override key a tab owns, so save and dirty-check stay scoped to it. */
function keysForTab(tab: TabDefinition): string[] {
  const keys = tab.entityKeys.flatMap((key) => [
    entityLabelKey(key, 'singular'),
    entityLabelKey(key, 'plural'),
  ]);

  if (tab.fieldEntity) {
    for (const field of fields[tab.fieldEntity]) {
      if (field.kind === 'editable') {
        keys.push(fieldLabelKey(tab.fieldEntity, field.key));
      }
    }
  }

  if (tab.showSections) {
    keys.push(...sectionOrder.map(sectionLabelKey));
  }

  keys.push(...(tab.pageKeys ?? []).map(pageLabelKey));

  return keys;
}

export function LabelsCard() {
  const labels = useLabels();
  const utils = api.useUtils();
  const saved = useMemo(() => labelValues(labels), [labels]);
  const [draft, setDraft] = useState<Record<string, string>>(saved);
  const previousSaved = useRef(saved);

  // After a save the server may normalise a value (trim, or collapse it to the
  // default). Re-sync only the keys whose saved value actually moved, so edits
  // pending in other tabs survive.
  useEffect(() => {
    const changed = Object.keys(saved).filter(
      (key) => saved[key] !== previousSaved.current[key],
    );
    if (changed.length > 0) {
      setDraft((prev) => ({
        ...prev,
        ...Object.fromEntries(changed.map((key) => [key, saved[key] ?? ''])),
      }));
    }
    previousSaved.current = saved;
  }, [saved]);

  const updateMutation = api.label.update.useMutation({
    onSuccess: () => utils.label.get.invalidate(),
  });

  const set = (key: string, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /** Writes the default TEXT into the inputs — not an empty string. */
  const resetKeys = (keys: string[]) =>
    setDraft((prev) => ({
      ...prev,
      ...Object.fromEntries(
        keys.map((key) => [key, defaultLabelValues[key] ?? '']),
      ),
    }));

  const isDirty = (keys: string[]) =>
    keys.some((key) => (draft[key] ?? '') !== (saved[key] ?? ''));

  const save = async (keys: string[]) => {
    const values = Object.fromEntries(
      keys.map((key) => [key, draft[key] ?? '']),
    );

    try {
      await updateMutation.mutateAsync({ values });
      toast.success('Etiketler kaydedildi');
    } catch (error) {
      console.error(error);
      toast.error('Etiketler kaydedilirken bir hata oluştu');
    }
  };

  const renderEntityPair = (entityKey: EntityKey) => {
    const singularKey = entityLabelKey(entityKey, 'singular');
    const pluralKey = entityLabelKey(entityKey, 'plural');

    return (
      <div key={entityKey}>
        <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {labels.entity[entityKey].plural}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={singularKey}>Tekil</Label>
            <Input
              id={singularKey}
              onChange={(e) => set(singularKey, e.target.value)}
              placeholder={entities[entityKey].singular}
              value={draft[singularKey] ?? ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pluralKey}>Çoğul</Label>
            <Input
              id={pluralKey}
              onChange={(e) => set(pluralKey, e.target.value)}
              placeholder={entities[entityKey].plural}
              value={draft[pluralKey] ?? ''}
            />
          </div>
        </div>
      </div>
    );
  };

  /**
   * `inherited`/`composed` fields normally back a real form control (e.g.
   * customerCard's `businessGroup` combobox), so they belong in the numbered
   * "Alanlar" list like any other field. The one exception is
   * businessGroupCard's `businessGroupName`: that card has no create form of
   * its own (it's spawned alongside its businessGroup), so the field only
   * ever shows up as a table column. `composed` fields (visit's
   * `customerCardName`/`customerCardGsm`) are always derived display text,
   * never a form control, so they're column-only too.
   */
  const isColumnOnlyField = (entity: FieldEntityKey, field: FieldDefinition) =>
    field.kind === 'composed' ||
    (field.kind === 'inherited' && entity === 'businessGroupCard');

  const renderFieldRow = (
    entity: FieldEntityKey,
    field: FieldDefinition,
    position: number,
    unit?: string,
  ) => {
    const rowId = `${entity}-${field.key}`;
    const resolved = labels.field[entity] as Record<string, string>;

    if (field.kind === 'inherited') {
      return (
        <LabelFieldRow
          badge={SOURCE_BADGE[field.from] ?? 'Devralınır'}
          defaultValue={labels.entity[field.from].singular}
          id={rowId}
          key={field.key}
          position={position}
          unit={unit}
        />
      );
    }

    if (field.kind === 'composed') {
      return (
        <LabelFieldRow
          badge={SOURCE_BADGE[field.fromEntity] ?? 'Devralınır'}
          defaultValue={resolved[field.key] ?? ''}
          id={rowId}
          key={field.key}
          position={position}
          unit={unit}
        />
      );
    }

    const key = fieldLabelKey(entity, field.key);

    return (
      <LabelFieldRow
        badge={field.required ? 'Formda Zorunlu' : 'Formda Opsiyonel'}
        defaultValue={field.default}
        id={rowId}
        key={field.key}
        onChange={(value) => set(key, value)}
        onReset={() => resetKeys([key])}
        position={position}
        value={draft[key]}
      />
    );
  };

  /** A faithful top-to-bottom mirror of the actual form — column-only
   * entries are excluded here and rendered separately. */
  const renderFieldRows = (entity: FieldEntityKey) =>
    fields[entity]
      .filter((field) => !isColumnOnlyField(entity, field))
      .map((field, index) => renderFieldRow(entity, field, index + 1));

  /** Column-only entries: visible and read-only, numbered within their own
   * list rather than the form's. */
  const renderColumnOnlyRows = (entity: FieldEntityKey) =>
    fields[entity]
      .filter((field) => isColumnOnlyField(entity, field))
      .map((field, index) => renderFieldRow(entity, field, index + 1, 'Sütun'));

  const renderSectionRows = () =>
    sectionOrder.map((sectionKey, index) => {
      const key = sectionLabelKey(sectionKey);

      return (
        <LabelFieldRow
          badge="Form Bölümü"
          defaultValue={sections[sectionKey]}
          id={key}
          key={sectionKey}
          onChange={(value) => set(key, value)}
          onReset={() => resetKeys([key])}
          position={index + 1}
          unit="Bölüm"
          value={draft[key]}
        />
      );
    });

  const renderPageRow = (pageKey: PageKey) => {
    const key = pageLabelKey(pageKey);

    return (
      <LabelFieldRow
        badge="Sayfa Başlığı"
        defaultValue={defaultLabelValues[key] ?? ''}
        id={key}
        key={pageKey}
        onChange={(value) => set(key, value)}
        onReset={() => resetKeys([key])}
        position={1}
        unit="Başlık"
        value={draft[key]}
      />
    );
  };

  const tabTitle = (tab: TabDefinition) =>
    tab.titleEntity
      ? labelCompose.tableTitle(labels.entity[tab.titleEntity])
      : (tab.staticTitle ?? tab.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etiketler</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customerCard">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tabTitle(tab)}
                {isDirty(keysForTab(tab)) && (
                  <span className="ml-1.5 inline-block size-1.5 rounded-full bg-primary" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => {
            const keys = keysForTab(tab);
            const columnOnlyRows = tab.fieldEntity
              ? renderColumnOnlyRows(tab.fieldEntity)
              : [];

            return (
              <TabsContent className="space-y-4" key={tab.id} value={tab.id}>
                <div className="space-y-4">
                  {tab.entityKeys.map(renderEntityPair)}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => resetKeys(keys)}
                    type="button"
                    variant="outline"
                  >
                    Varsayılanları Getir
                  </Button>
                  <Button
                    disabled={!isDirty(keys) || updateMutation.isPending}
                    onClick={() => save(keys)}
                    type="button"
                  >
                    {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>

                {tab.fieldEntity && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Alanlar
                    </p>
                    {renderFieldRows(tab.fieldEntity)}
                  </div>
                )}

                {columnOnlyRows.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Sütunlar
                    </p>
                    {columnOnlyRows}
                  </div>
                )}

                {tab.showSections && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Bölüm Başlıkları
                    </p>
                    {renderSectionRows()}
                  </div>
                )}

                {tab.pageKeys && tab.pageKeys.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Sayfa Başlıkları
                    </p>
                    {tab.pageKeys.map(renderPageRow)}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
