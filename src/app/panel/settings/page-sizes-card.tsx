'use client';

import { InfoIcon, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
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
  // Which sections have a Kaydet in flight, so saving one section doesn't
  // disable — or flash "Kaydediliyor..." on — any other section's button,
  // and two overlapping saves each track their own state instead of one
  // clobbering the other.
  const [savingKeys, setSavingKeys] = useState<Set<PageSizeTableKey>>(
    () => new Set(),
  );
  /**
   * The draft submitted per table key, captured at `save()` time. Not
   * state — it must not trigger a render — just a way for `onSuccess` to
   * tell "the draft I submitted" apart from "whatever the draft is now".
   */
  const submittedRef = useRef<Partial<Record<PageSizeTableKey, DraftConfig>>>(
    {},
  );

  const updateMutation = api.pageSize.update.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success('Sayfa boyutu kaydedildi');
      setDrafts((current) => {
        const submitted = submittedRef.current[variables.tableKey];
        const stillUnchanged =
          submitted !== undefined &&
          sameDraft(current[variables.tableKey], submitted);
        /**
         * Only resync the draft if it still equals what was submitted. The
         * inputs stay interactive during the round trip (disabling them
         * mid-keystroke would be worse), so the admin may have kept
         * editing this section while the request was in flight — in which
         * case overwriting `drafts` here would silently discard that edit
         * with no warning and no dirty dot to reveal the loss. If they did
         * edit, the section is genuinely dirty again, correctly shows as
         * such, and the next save resyncs it.
         *
         * When it IS still unchanged, `variables.options`/`defaultValue`
         * are what the server actually persisted — `fromDraft` already
         * sorted `options` ascending before `mutate` was called — so
         * resetting to that value (rather than waiting on the refetch
         * below) is what keeps `sameDraft`'s element-by-index comparison
         * in sync: an unsorted-but-valid draft (e.g. adding a smaller
         * option after removing the largest) would otherwise never match
         * the now-ascending `saved` value and the section would stay
         * dirty forever.
         */
        if (!stillUnchanged) return current;
        return {
          ...current,
          [variables.tableKey]: toDraft({
            options: variables.options,
            defaultValue: variables.defaultValue,
          }),
        };
      });
      // Refreshes this card's dirty baseline. Tables read `pageSize` as a
      // server-rendered prop threaded down from their route's page.tsx, not
      // from this query, so they pick up the change on their next load
      // rather than here.
      await utils.pageSize.get.invalidate();
    },
    onError: (error) => toast.error(error.message),
    onSettled: (_data, _error, variables) => {
      setSavingKeys((current) => {
        const next = new Set(current);
        next.delete(variables.tableKey);
        return next;
      });
    },
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
    submittedRef.current[key] = drafts[key];
    setSavingKeys((current) => new Set(current).add(key));
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
          const isSaving = savingKeys.has(key);

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

              {/* Column header for the radios. Left-aligned with the radio
                  itself rather than indented — the label is wider than the
                  control it heads, so any spacer pushes it over the value
                  column and reads as though it labels the inputs. */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-muted-foreground text-xs">
                    Varsayılan
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="size-3.5 shrink-0 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[260px]">
                        <p className="text-xs">
                          Bu liste açıldığında kullanılacak sayfa boyutu.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
                    // biome-ignore lint/suspicious/noArrayIndexKey: removeOption does shift subsequent indices, but PageSizeRow and its Input/Button are fully controlled with no internal state, so a reused fiber at a shifted index simply re-renders with the new props — there's no stale state to leak
                    key={`${key}-${index}`}
                    name={`page-size-default-${key}`}
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
                    disabled={!dirty || !isValid(draft) || isSaving}
                    onClick={() => save(key)}
                    size="sm"
                    type="button"
                  >
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
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
