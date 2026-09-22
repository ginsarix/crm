'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { useLabels } from '~/hooks/use-labels';
import { labelCompose } from '~/shared/labels/compose';
import {
  addOption,
  type DraftConfig,
  fromDraft,
  removeOption,
  setDefaultOption,
  setOptionValue,
  toDraft,
} from '~/shared/page-sizes/mutate';
import {
  pageSizeTableOrder,
  pageSizeTables,
} from '~/shared/page-sizes/registry';
import type {
  PageSizeTableKey,
  ResolvedPageSizes,
} from '~/shared/page-sizes/types';
import {
  MAX_OPTION_COUNT,
  MAX_PAGE_SIZE,
  MIN_OPTION_COUNT,
  MIN_PAGE_SIZE,
  PageSizeTableConfigSchema,
} from '~/shared/zod-schemas/page-size';
import { api } from '~/trpc/react';
import { PageSizeRow } from './page-size-row';

type Drafts = Record<PageSizeTableKey, DraftConfig>;

/** Per-row message, or undefined when the row is fine. Duplicates mark every
 * row sharing the value, so the admin sees both halves of the collision. */
function rowErrors(draft: DraftConfig): (string | undefined)[] {
  const counts = new Map<string, number>();
  for (const value of draft.options) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return draft.options.map((value) => {
    if (value.trim() === '') return 'Geçerli bir sayı girin';
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return 'Geçerli bir sayı girin';
    if (parsed < MIN_PAGE_SIZE || parsed > MAX_PAGE_SIZE) {
      return `${MIN_PAGE_SIZE} ile ${MAX_PAGE_SIZE} arasında olmalı`;
    }
    if ((counts.get(value) ?? 0) > 1)
      return 'Aynı değerden birden fazla olamaz';
    return undefined;
  });
}

const isValid = (draft: DraftConfig) =>
  PageSizeTableConfigSchema.safeParse(fromDraft(draft)).success;

const sameDraft = (a: DraftConfig, b: DraftConfig) =>
  a.defaultValue === b.defaultValue &&
  a.options.length === b.options.length &&
  a.options.every((value, index) => value === b.options[index]);

export function PageSizesCard({ pageSizes }: { pageSizes: ResolvedPageSizes }) {
  const labels = useLabels();
  const utils = api.useUtils();
  /**
   * The dirty baseline must come from the query, not the `pageSizes` prop.
   * The prop is fixed for the life of the page, so after a successful save the
   * prop would still hold the pre-save config and every saved section would
   * stay marked dirty forever. `initialData` keeps the first render
   * synchronous — unlike the table page-clients, nothing here seeds `useState`
   * from it, so there is no mount-time race.
   */
  const { data: saved } = api.pageSize.get.useQuery(undefined, {
    initialData: pageSizes,
  });
  const [drafts, setDrafts] = useState<Drafts>(
    () =>
      Object.fromEntries(
        pageSizeTableOrder.map((key) => [key, toDraft(pageSizes[key])]),
      ) as Drafts,
  );

  const updateMutation = api.pageSize.update.useMutation({
    onSuccess: async () => {
      toast.success('Sayfa boyutu kaydedildi');
      // Refreshes both this card's dirty baseline and the option lists of
      // every mounted table.
      await utils.pageSize.get.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const edit = (key: PageSizeTableKey, next: DraftConfig) =>
    setDrafts((current) => ({ ...current, [key]: next }));

  const tableTitle = (key: PageSizeTableKey) => {
    const table = pageSizeTables[key];
    return 'titleEntity' in table
      ? labelCompose.tableTitle(labels.entity[table.titleEntity])
      : table.staticTitle;
  };

  const save = (key: PageSizeTableKey) => {
    const parsed = PageSizeTableConfigSchema.safeParse(fromDraft(drafts[key]));
    if (!parsed.success) return;
    updateMutation.mutate({ tableKey: key, ...parsed.data });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sayfa Boyutu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {pageSizeTableOrder.map((key) => {
          const draft = drafts[key];
          const dirty = !sameDraft(draft, toDraft(saved[key]));
          const errors = rowErrors(draft);

          return (
            <div
              className="space-y-3"
              data-testid={`page-size-section-${key}`}
              key={key}
            >
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{tableTitle(key)}</p>
                {dirty && (
                  <span className="inline-block size-1.5 rounded-full bg-primary" />
                )}
              </div>

              <div className="space-y-2">
                {draft.options.map((value, index) => (
                  <PageSizeRow
                    canRemove={draft.options.length > MIN_OPTION_COUNT}
                    error={errors[index]}
                    isDefault={
                      value === draft.defaultValue &&
                      draft.options.indexOf(value) === index
                    }
                    // biome-ignore lint/suspicious/noArrayIndexKey: rows are never reordered while editing (the sort happens on save), so the index is a stable key here
                    key={`${key}-${index}`}
                    onChange={(next) =>
                      edit(key, setOptionValue(draft, index, next))
                    }
                    onRemove={() => edit(key, removeOption(draft, index))}
                    onSetDefault={() =>
                      edit(key, setDefaultOption(draft, index))
                    }
                    value={value}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  className="cursor-pointer"
                  disabled={draft.options.length >= MAX_OPTION_COUNT}
                  onClick={() => edit(key, addOption(draft))}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Seçenek Ekle {draft.options.length}/{MAX_OPTION_COUNT}
                </Button>

                <div className="flex gap-2">
                  <Button
                    className="cursor-pointer"
                    onClick={() =>
                      edit(
                        key,
                        toDraft({
                          options: [...pageSizeTables[key].options].sort(
                            (a, b) => a - b,
                          ),
                          defaultValue: pageSizeTables[key].defaultValue,
                        }),
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Varsayılanları Getir
                  </Button>
                  <Button
                    className="cursor-pointer"
                    disabled={
                      !dirty || !isValid(draft) || updateMutation.isPending
                    }
                    onClick={() => save(key)}
                    size="sm"
                    type="button"
                  >
                    {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
