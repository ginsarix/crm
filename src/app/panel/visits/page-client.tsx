'use client';

import type {
  PaginationState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import type { columnMap } from '~/lib/column-map';
import { cn } from '~/lib/utils';
import { authClient } from '~/server/better-auth/client';
import { api } from '~/trpc/react';
import type { RouterOutputs } from '~/trpc/types';

type VisitWithCustomerCard = RouterOutputs['visit']['get']['data'][number];
type VisitSearchScope = 'all' | keyof typeof columnMap.visit;

import { BulkActionsBar } from '../_components/bulk-actions-bar';
import { DataTable } from '../../_components/data-table';
import { createColumns } from './columns';
import { CreateVisitDialog } from './create-dialog';
import { FilterControls } from './filter-controls';
import RelatedVisitsDialog from './related-visits-dialog';
import { ViewVisitDialog } from './view-dialog';

export function VisitsPageClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [selectedVisit, setSelectedVisit] =
    useState<VisitWithCustomerCard | null>(null);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [via, setVia] = useState<
    'phone' | 'inPerson' | 'email' | 'sms' | 'all'
  >('all');
  const [searchScope, setSearchScope] = useState<VisitSearchScope>('all');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === 'admin';
  const utils = api.useUtils();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using pagination sub-fields as deps
  useEffect(() => {
    setRowSelection({});
  }, [pagination.pageIndex, pagination.pageSize]);

  const bulkDeleteMutation = api.visit.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.visit.get.invalidate();
      utils.visit.getTotal.invalidate();
      toast.success(`${result.count} ziyaret silindi`);
      setRowSelection({});
      setDeleteConfirmOpen(false);
    },
    onError: () => toast.error('Silme işlemi sırasında hata oluştu'),
  });

  const { data, isLoading } = api.visit.get.useQuery({
    page: pagination.pageIndex + 1, // Convert 0-based to 1-based for API
    itemsPerPage: pagination.pageSize,
    filter: {
      search,
      via,
      searchScope,
    },
    sorting,
  });

  const handleViewVisit = (visit: VisitWithCustomerCard) => {
    setSelectedVisit(visit);
    setViewDialogOpen(true);
  };

  const pathname = useParams();
  const customerCardId = pathname.slug?.[0];

  const relatedVisits = useMemo(
    () =>
      customerCardId && data?.data
        ? data.data.filter((visit) => visit.customerCardId === customerCardId)
        : [],
    [data?.data, customerCardId],
  );

  const noVisitsToastShown = useRef(false);
  useEffect(() => {
    if (
      !isLoading &&
      data &&
      customerCardId &&
      relatedVisits.length === 0 &&
      !noVisitsToastShown.current
    ) {
      noVisitsToastShown.current = true;
      toast.info('Bu cari kartın henüz ziyareti bulunmamakta');
    }
  }, [isLoading, data, customerCardId, relatedVisits.length]);

  const columns = createColumns(handleViewVisit);

  const selectedIds = Object.keys(rowSelection);

  const bulkActionsBar = (
    <BulkActionsBar
      count={isAdmin ? selectedIds.length : 0}
      onClear={() => setRowSelection({})}
    >
      <Button
        onClick={() => setDeleteConfirmOpen(true)}
        size="sm"
        variant="destructive"
      >
        <Trash2 className="h-4 w-4" />
        Sil
      </Button>
    </BulkActionsBar>
  );

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls
            onSearch={setSearch}
            onSearchScope={setSearchScope}
            onVia={setVia}
            search={search}
            searchScope={searchScope}
            via={via}
          />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">Ziyaretler</CardTitle>
            <div className="ml-auto">
              <CreateVisitDialog />
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
              exportFilename="ziyaretler"
              onRowSelectionChange={setRowSelection}
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              rowSelection={rowSelection}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="visits"
              totalCount={data?.pagination?.totalItems}
            />
          </div>
        )}

        {selectedVisit && (
          <ViewVisitDialog
            onOpenChange={setViewDialogOpen}
            onUpdate={(updatedVisit) => setSelectedVisit(updatedVisit)}
            open={viewDialogOpen}
            visit={selectedVisit}
          />
        )}

        {customerCardId && relatedVisits.length > 0 && (
          <RelatedVisitsDialog visits={relatedVisits} />
        )}

        <Dialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Toplu Silme</DialogTitle>
              <DialogDescription>
                {selectedIds.length} ziyareti silmek istediğinizden emin
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
