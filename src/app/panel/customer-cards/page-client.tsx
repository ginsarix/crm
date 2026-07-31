'use client';

import { keepPreviousData } from '@tanstack/react-query';
import type {
  PaginationState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import type { $Enums, CustomerCard } from 'generated/prisma';
import { Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import { authClient } from '~/server/better-auth/client';
import { AuthorizationDocumentValidation } from '~/shared/zod-schemas/authorization-document';
import { DistrictValidation } from '~/shared/zod-schemas/district';
import { StatusValidation } from '~/shared/zod-schemas/status';
import { VoteValidation } from '~/shared/zod-schemas/vote';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { BulkActionsBar } from '../_components/bulk-actions-bar';
import ColorControl from './color-control';
import { type CustomerCardRow, createColumns } from './columns';
import { CreateCustomerCardDialog } from './create-dialog';
import { FilterControls } from './filter-controls';
import { ViewCustomerCardDialog } from './view-dialog';

const ColorValidation = z.enum([
  'green',
  'blue',
  'orange',
  'yellow',
  'gray',
  'purple',
  'all',
]);

export function CustomerCardsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [selectedCustomerCard, setSelectedCustomerCard] =
    useState<CustomerCardRow | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  type BulkColor = 'green' | 'blue' | 'orange' | 'yellow' | 'gray' | 'purple';
  const [bulkColor, setBulkColor] = useState<BulkColor | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === 'admin';
  const utils = api.useUtils();

  // Local state for the search input — avoids sluggish typing caused by URL-roundtrip on every keystroke
  const urlSearch = searchParams.get('search') ?? '';
  const lastWrittenSearch = useRef(urlSearch);
  const [search, setSearch] = useState(urlSearch);

  // Sync URL → local only on external navigation (back/forward), not on our own writes
  useEffect(() => {
    if (urlSearch !== lastWrittenSearch.current) {
      lastWrittenSearch.current = urlSearch;
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  // Derive remaining filter values directly from URL
  const color =
    ColorValidation.safeParse(searchParams.get('color')).data ?? 'all';
  const searchScope = (searchParams.get('search_scope') ?? 'all') as
    | 'all'
    | keyof CustomerCard;
  const businessGroup = searchParams.get('business_group') ?? '';
  const salesRepresentative = searchParams.get('sales_representative') ?? '';
  const district = (DistrictValidation.safeParse(searchParams.get('district'))
    .data ?? '') as '' | $Enums.District;
  const rawStatus = searchParams.get('status') ?? '';
  const status = (
    rawStatus === '__null__'
      ? '__null__'
      : (StatusValidation.safeParse(rawStatus).data ?? '')
  ) as '' | '__null__' | $Enums.Status;
  const rawAuthorizationDocument =
    searchParams.get('authorization_document') ?? '';
  const authorizationDocument = (
    rawAuthorizationDocument === '__null__'
      ? '__null__'
      : (AuthorizationDocumentValidation.safeParse(rawAuthorizationDocument)
          .data ?? '')
  ) as '' | '__null__' | $Enums.AuthorizationDocument;
  const rawVote = searchParams.get('vote') ?? '';
  const vote = (
    rawVote === '__null__'
      ? '__null__'
      : (VoteValidation.safeParse(rawVote).data ?? '')
  ) as '' | '__null__' | $Enums.Vote;
  const emptyField = (searchParams.get('empty_field') ?? '') as
    | ''
    | keyof CustomerCard;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Flat filter snapshot for saving as a preset, and the reverse — applying a
  // saved preset by replacing the URL wholesale with its stored params
  const currentFilters: Record<string, string> = {
    search: urlSearch,
    color: color === 'all' ? '' : color,
    search_scope: searchScope === 'all' ? '' : searchScope,
    business_group: businessGroup,
    sales_representative: salesRepresentative,
    district,
    status,
    authorization_document: authorizationDocument,
    vote,
    empty_field: emptyField,
  };

  const handleApplyPreset = useCallback(
    (filters: Record<string, string>) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }
      router.replace(`?${params.toString()}`);
    },
    [router],
  );

  // Stable ref so the debounce effect doesn't re-fire when searchParams changes
  const updateParamRef = useRef(updateParam);
  useEffect(() => {
    updateParamRef.current = updateParam;
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using pagination sub-fields as deps
  useEffect(() => {
    setRowSelection({});
  }, [pagination.pageIndex, pagination.pageSize]);

  // Reset to page 0 when any filter changes. This effect fires after the URL update is
  // reflected in searchParams, preventing a query with page 0 + stale filter.
  const filterKey = [
    color,
    urlSearch,
    searchScope,
    businessGroup,
    salesRepresentative,
    district,
    status,
    authorizationDocument,
    vote,
    emptyField,
  ].join('|');
  const prevFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (filterKey !== prevFilterKeyRef.current) {
      prevFilterKeyRef.current = filterKey;
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [filterKey]);

  const bulkUpdateColorMutation = api.customerCard.bulkUpdateColor.useMutation({
    onSuccess: (result) => {
      utils.customerCard.get.invalidate();
      utils.customerCard.getColorCounts.invalidate();
      toast.success(`${result.count} kartın rengi güncellendi`);
      setRowSelection({});
      setBulkColor(null);
    },
    onError: () => toast.error('Renk güncellenirken hata oluştu'),
  });

  const bulkDeleteMutation = api.customerCard.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.customerCard.get.invalidate();
      utils.customerCard.getTotal.invalidate();
      utils.customerCard.getColorCounts.invalidate();
      toast.success(`${result.count} cari kart silindi`);
      setRowSelection({});
      setDeleteConfirmOpen(false);
    },
    onError: () => toast.error('Silme işlemi sırasında hata oluştu'),
  });

  // Debounce search → URL so the query only fires after the user pauses typing
  useEffect(() => {
    const timer = setTimeout(() => {
      lastWrittenSearch.current = search;
      updateParamRef.current('search', search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleReset = useCallback(() => {
    setSearch('');
    lastWrittenSearch.current = '';
    router.replace('?');
  }, [router]);

  const { data: businessGroupOptions } = api.businessGroup.get.useQuery();
  const { data: salesRepresentativeOptions } =
    api.salesRepresentative.get.useQuery();

  const { data, isLoading } = api.customerCard.get.useQuery(
    {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      filter: {
        search: urlSearch,
        color,
        searchScope,
        businessGroup,
        salesRepresentative,
        district,
        status,
        authorizationDocument,
        vote,
        emptyField,
      },
      sorting,
      includeRestricted: true,
    },
    { placeholderData: keepPreviousData },
  );

  const handleViewCustomerCard = (customerCard: CustomerCardRow) => {
    setSelectedCustomerCard(customerCard);
    setViewDialogOpen(true);
  };

  // Deep-link support: ?id=<customerCardId> opens the view dialog directly
  const idParam = searchParams.get('id');
  const { data: customerCardById, isFetched: customerCardByIdFetched } =
    api.customerCard.getById.useQuery(
      { id: idParam ?? '' },
      { enabled: !!idParam },
    );

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleViewCustomerCard/updateParam are recreated every render; only re-run when the id param or its fetch result changes
  useEffect(() => {
    if (!idParam) return;
    if (customerCardById) {
      handleViewCustomerCard(customerCardById);
    } else if (customerCardByIdFetched) {
      toast.error('Cari kart bulunamadı');
      updateParam('id', '');
    }
  }, [idParam, customerCardById, customerCardByIdFetched]);

  const handleViewDialogOpenChange = (next: boolean) => {
    setViewDialogOpen(next);
    if (!next && idParam) {
      updateParam('id', '');
    }
  };

  const columns = createColumns(handleViewCustomerCard);

  const selectedIds = Object.keys(rowSelection);

  const bulkActionsBar = (
    <BulkActionsBar
      count={selectedIds.length}
      onClear={() => setRowSelection({})}
    >
      <ColorControl
        color={
          (bulkColor ?? 'all') as
            | 'green'
            | 'blue'
            | 'orange'
            | 'yellow'
            | 'gray'
            | 'purple'
            | 'all'
        }
        setColor={(c) => setBulkColor(c === 'all' ? null : (c as BulkColor))}
      />
      <Button
        disabled={!bulkColor || bulkUpdateColorMutation.isPending}
        onClick={() =>
          bulkUpdateColorMutation.mutate({
            ids: selectedIds,
            color: bulkColor as $Enums.Color,
          })
        }
        size="sm"
      >
        {bulkUpdateColorMutation.isPending ? 'Uygulanıyor...' : 'Uygula'}
      </Button>
      {isAdmin && (
        <Button
          onClick={() => setDeleteConfirmOpen(true)}
          size="sm"
          variant="destructive"
        >
          <Trash2 className="h-4 w-4" />
          Sil
        </Button>
      )}
    </BulkActionsBar>
  );

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls
            authorizationDocument={authorizationDocument}
            businessGroup={businessGroup}
            businessGroupOptions={
              businessGroupOptions?.map(
                (businessGroup) => businessGroup.name,
              ) ?? []
            }
            color={color}
            currentFilters={currentFilters}
            district={district}
            emptyField={emptyField}
            onApplyPreset={handleApplyPreset}
            onAuthorizationDocument={(v) =>
              updateParam('authorization_document', v)
            }
            onBusinessGroup={(v) => updateParam('business_group', v)}
            onColor={(v) => updateParam('color', v === 'all' ? '' : v)}
            onDistrict={(v) => updateParam('district', v)}
            onEmptyField={(v) => updateParam('empty_field', v)}
            onReset={handleReset}
            onSalesRepresentative={(v) =>
              updateParam('sales_representative', v)
            }
            onSearch={setSearch}
            onSearchScope={(v) =>
              updateParam('search_scope', v === 'all' ? '' : v)
            }
            onStatus={(v) => updateParam('status', v)}
            onVote={(v) => updateParam('vote', v)}
            salesRepresentative={salesRepresentative}
            salesRepresentativeOptions={
              salesRepresentativeOptions?.map(
                (salesRepresentative) => salesRepresentative.name,
              ) ?? []
            }
            search={search}
            searchScope={searchScope}
            status={status}
            vote={vote}
          />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">Cari Kartlar</CardTitle>
            <div className="ml-auto">
              <CreateCustomerCardDialog />
            </div>
          </CardHeader>
        </Card>
        {isLoading ? (
          <div className="flex justify-center">
            <Spinner className="mt-10 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              bulkActionsBar={bulkActionsBar}
              columns={columns}
              data={data?.data ?? []}
              defaultColumnVisibility={{
                sira: false,
                sicil: false,
                region: false,
                gsm2: false,
                gsm3: false,
                contact2: false,
                contact3: false,
                status: false,
                color: false,
              }}
              exportFilename="cari_kartlar"
              getRowRestricted={(row) => row.isRestricted === true}
              onRowSelectionChange={setRowSelection}
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              rowSelection={rowSelection}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="customer-cards"
              totalCount={data?.pagination?.totalItems}
            />
          </div>
        )}

        {selectedCustomerCard && (
          <ViewCustomerCardDialog
            customerCard={selectedCustomerCard}
            onOpenChange={handleViewDialogOpenChange}
            onUpdate={(updatedCustomerCard) => {
              setSelectedCustomerCard(updatedCustomerCard);
              utils.customerCard.get.setData(
                {
                  page: pagination.pageIndex + 1,
                  itemsPerPage: pagination.pageSize,
                  filter: {
                    search: urlSearch,
                    color,
                    searchScope,
                    businessGroup,
                    salesRepresentative,
                    district,
                    status,
                    authorizationDocument,
                    vote,
                  },
                  sorting,
                  includeRestricted: true,
                },
                (old) =>
                  old
                    ? {
                        ...old,
                        data: old.data.map((c) =>
                          c.id === updatedCustomerCard.id
                            ? { ...c, ...updatedCustomerCard }
                            : c,
                        ),
                      }
                    : old,
              );
            }}
            open={viewDialogOpen}
          />
        )}

        <Dialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Toplu Silme</DialogTitle>
              <DialogDescription>
                {selectedIds.length} cari kartı silmek istediğinizden emin
                misiniz? Bu işlem geri alınamaz.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => setDeleteConfirmOpen(false)}
                variant="outline"
              >
                İptal
              </Button>
              <Button
                disabled={bulkDeleteMutation.isPending}
                onClick={() => bulkDeleteMutation.mutate({ ids: selectedIds })}
                variant="destructive"
              >
                {bulkDeleteMutation.isPending ? 'Siliniyor...' : 'Evet, Sil'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
