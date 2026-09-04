'use client';
import type { RowSelectionState } from '@tanstack/react-table';
import type { BusinessGroup } from 'generated/prisma';
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
import { createColumns } from './business-groups-columns';
import { CreateBusinessGroupDialog } from './create-business-group-dialog';
import { ViewBusinessGroupDialog } from './view-business-group-dialog';

export default function BusinessGroupsTable() {
  const { data, isLoading } = api.businessGroup.get.useQuery({
    includePassive: true,
  });
  const utils = api.useUtils();

  const [selectedBusinessGroup, setSelectedBusinessGroup] =
    useState<BusinessGroup | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const bulkDeleteMutation = api.businessGroup.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.businessGroup.get.invalidate();
      toast.success(`${result.count} meslek grubu silindi`);
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

  const handleViewBusinessGroup = (businessGroup: BusinessGroup) => {
    setSelectedBusinessGroup(businessGroup);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewBusinessGroup);
  return (
    <div>
      <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
        <CardHeader className="flex flex-row items-center">
          <CardTitle className="mr-auto">Meslek Grupları</CardTitle>
          <div className="ml-auto">
            <CreateBusinessGroupDialog />
          </div>
        </CardHeader>
      </Card>
      <DataTable
        bulkActionsBar={bulkActionsBar}
        columns={columns}
        data={data ?? []}
        exportFilename="meslek_grupları"
        onRowSelectionChange={setRowSelection}
        rowSelection={rowSelection}
        tableId="business-groups"
      />

      {selectedBusinessGroup && (
        <ViewBusinessGroupDialog
          businessGroup={selectedBusinessGroup}
          onOpenChange={setViewDialogOpen}
          onUpdate={(updatedBusinessGroup) => {
            setSelectedBusinessGroup(updatedBusinessGroup);
          }}
          open={viewDialogOpen}
        />
      )}

      <Dialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Silme</DialogTitle>
            <DialogDescription>
              {selectedIds.length} meslek grubunu silmek istediğinizden emin
              misiniz? İlgili cari kartların meslek grubu bilgisi temizlenecek.
              Bu işlem geri alınamaz.
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
