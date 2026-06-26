'use client';
import type { RowSelectionState } from '@tanstack/react-table';
import type { SalesRepresentative } from 'generated/prisma';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { CreateSaleRepresentativeDialog } from './create-sale-representative-dialog';
import { createColumns } from './sale-representatives-columns';
import { ViewSaleRepresentativeDialog } from './view-sale-representative-dialog';

export default function SaleRepresentativesTable() {
  const { data, isLoading } = api.salesRepresentative.get.useQuery();
  const utils = api.useUtils();

  const [selectedSalesRepresentative, setSelectedSalesRepresentative] =
    useState<SalesRepresentative | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const bulkDeleteMutation = api.salesRepresentative.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.salesRepresentative.get.invalidate();
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
        <CardHeader className="flex flex-row items-center">
          <CardTitle className="mr-auto">Satış Temsilcileri</CardTitle>
          <div className="ml-auto">
            <CreateSaleRepresentativeDialog />
          </div>
        </CardHeader>
      </Card>
      <DataTable
        bulkActionsBar={bulkActionsBar}
        columns={columns}
        data={data ?? []}
        exportFilename="satis_temsilcileri"
        onRowSelectionChange={setRowSelection}
        rowSelection={rowSelection}
        tableId="sale-representatives"
      />

      {selectedSalesRepresentative && (
        <ViewSaleRepresentativeDialog
          onOpenChange={setViewDialogOpen}
          onUpdate={(updatedSalesRepresentative) => {
            setSelectedSalesRepresentative(updatedSalesRepresentative);
            utils.salesRepresentative.get.setData(
              undefined,
              (old) => old ? old.map((s) => s.id === updatedSalesRepresentative.id ? updatedSalesRepresentative : s) : old,
            );
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
