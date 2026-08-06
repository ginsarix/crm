'use client';
import type {
  PaginationState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import type { SalesRepresentative } from 'generated/prisma';
import { SearchIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '~/app/_components/data-table';
import { BulkActionsBar } from '~/app/panel/_components/bulk-actions-bar';
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { CreateSaleRepresentativeDialog } from './create-sale-representative-dialog';
import { createColumns } from './sale-representatives-columns';
import { ViewSaleRepresentativeDialog } from './view-sale-representative-dialog';

export default function SaleRepresentativesTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [selectedSalesRepresentative, setSelectedSalesRepresentative] =
    useState<SalesRepresentative | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const utils = api.useUtils();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using pagination sub-fields as deps
  useEffect(() => {
    setRowSelection({});
  }, [pagination.pageIndex, pagination.pageSize]);

  const { data, isLoading } = api.salesRepresentative.getPaginated.useQuery({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: { search: debouncedSearch },
    sorting,
  });

  const bulkDeleteMutation = api.salesRepresentative.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.salesRepresentative.get.invalidate();
      utils.salesRepresentative.getPaginated.invalidate();
      toast.success(`${result.count} satış temsilcisi silindi`);
      setRowSelection({});
      setDeleteConfirmOpen(false);
    },
    onError: () => toast.error('Silme işlemi sırasında hata oluştu'),
  });

  const selectedIds = Object.keys(rowSelection);

  const bulkActionsBar = (
    <BulkActionsBar
      count={selectedIds.length}
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

  const handleViewSalesRepresentative = (
    salesRepresentative: SalesRepresentative,
  ) => {
    setSelectedSalesRepresentative(salesRepresentative);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewSalesRepresentative);
  return (
    <div>
      <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <CardTitle className="sm:mr-auto">Satış Temsilcileri</CardTitle>
          <InputGroup className="sm:w-64">
            <InputGroupInput
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara"
              type="search"
              value={search}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
          <CreateSaleRepresentativeDialog />
        </CardHeader>
      </Card>
      <DataTable
        bulkActionsBar={bulkActionsBar}
        columns={columns}
        data={data?.data ?? []}
        exportFilename="satis_temsilcileri"
        onRowSelectionChange={setRowSelection}
        pageCount={data?.pagination?.totalPages ?? -1}
        pagination={pagination}
        rowSelection={rowSelection}
        setPagination={setPagination}
        setSorting={setSorting}
        sorting={sorting}
        tableId="sale-representatives"
        totalCount={data?.pagination?.totalItems}
      />

      {selectedSalesRepresentative && (
        <ViewSaleRepresentativeDialog
          onOpenChange={setViewDialogOpen}
          onUpdate={(updatedSalesRepresentative) => {
            setSelectedSalesRepresentative(updatedSalesRepresentative);
          }}
          open={viewDialogOpen}
          salesRepresentative={selectedSalesRepresentative}
        />
      )}

      <Dialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Silme</DialogTitle>
            <DialogDescription>
              {selectedIds.length} satış temsilcisini silmek istediğinizden emin
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
  );
}
