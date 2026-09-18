'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { InfoIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { useLabels } from '~/hooks/use-labels';
import { cn } from '~/lib/utils';
import { labelCompose } from '~/shared/labels/compose';
import {
  ElectionResultUpdateSchema,
  electionResultCountKeys,
} from '~/shared/zod-schemas/election-result';
import { api } from '~/trpc/react';

import { DataTable } from '../../_components/data-table';
import type { ElectionResultRow } from './columns';
import { createColumns } from './columns';
import { FilterControls } from './filter-controls';

export function ElectionResultsPageClient() {
  const labels = useLabels();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState('');

  const { data, isLoading } = api.electionResult.get.useQuery({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: { search },
    sorting,
  });

  const utils = api.useUtils();
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(ElectionResultUpdateSchema),
    defaultValues: {
      id: '',
      toplamOy: 0,
      kullanilanOy: 0,
      gecerliOy: 0,
      meclisUyeSayisi: 0,
      yesil: 0,
      mavi: 0,
      turuncu: 0,
    },
  });

  const updateMutation = api.electionResult.update.useMutation({
    onSuccess: async () => {
      setEditingRowId(null);
      await utils.electionResult.get.invalidate();
      toast.success(
        `${labels.entity.electionResult.singular} başarıyla güncellendi`,
      );
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        `${labels.entity.electionResult.singular} güncellenirken bir hata oluştu`,
      );
    },
  });

  const handleEdit = (row: ElectionResultRow) => {
    // One row edits at a time. Rather than silently discarding a dirty row,
    // make the user resolve it — there is no dialog in a table cell.
    if (editingRowId && editingRowId !== row.id && form.formState.isDirty) {
      toast.warning('Önce mevcut satırı kaydedin veya iptal edin');
      return;
    }
    // Written out rather than built with Object.fromEntries, which widens to
    // Record<string, number> and no longer satisfies the form's value type.
    form.reset({
      id: row.id,
      toplamOy: row.toplamOy,
      kullanilanOy: row.kullanilanOy,
      gecerliOy: row.gecerliOy,
      meclisUyeSayisi: row.meclisUyeSayisi,
      yesil: row.yesil,
      mavi: row.mavi,
      turuncu: row.turuncu,
    });
    setEditingRowId(row.id);
  };

  const handleCancel = () => {
    setEditingRowId(null);
    form.reset();
  };

  const handleSave = form.handleSubmit((values) =>
    updateMutation.mutate(values),
  );

  const columns = createColumns(labels, {
    editingRowId,
    form,
    isSaving: updateMutation.isPending,
    onEdit: handleEdit,
    onCancel: handleCancel,
    onSave: handleSave,
  });

  // Keyed by column id so the footer stays aligned when columns are hidden.
  // The totals come from the server and cover every matching group, not just
  // the rows on this page.
  const totals = data?.totals;
  const footerValues: Record<string, ReactNode> | undefined = totals && {
    businessGroupName: (
      <span className="flex items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="size-3.5 shrink-0 cursor-help text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="text-xs">
                Toplamlar, uygulanan filtrelere göre hesaplanır.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        Toplam
      </span>
    ),
    ...Object.fromEntries(
      electionResultCountKeys.map((key) => [
        key,
        <span className="tabular-nums" key={key}>
          {totals[key]}
        </span>,
      ]),
    ),
  };

  // Sorting/paginating can scroll the edited row off the page; close the
  // editor rather than leave the form bound to an invisible row. Refusing to
  // close would be worse than closing — but doing it silently when the row
  // was dirty just as bad, so warn instead of staying quiet about it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the view, not the form
  useEffect(() => {
    setEditingRowId((current) => {
      if (current !== null && form.formState.isDirty) {
        toast.warning('Kaydedilmemiş değişiklikler iptal edildi');
      }
      return null;
    });
  }, [pagination.pageIndex, pagination.pageSize, sorting, search]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls onSearch={setSearch} search={search} />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">
              {labelCompose.tableTitle(labels.entity.electionResult)}
            </CardTitle>
          </CardHeader>
        </Card>
        {isLoading ? (
          <div className="flex justify-center">
            <Spinner className="mt-10 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              exportFilename="secim_sonuclari"
              footerColor={data?.totals.color}
              footerValues={footerValues}
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="election-results"
              totalCount={data?.pagination?.totalItems}
            />
          </div>
        )}
      </div>
    </div>
  );
}
