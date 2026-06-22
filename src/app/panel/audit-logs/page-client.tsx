'use client';

import type {
  PaginationState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import type { AuditLog, User } from 'generated/prisma';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import type { HeartbeatHandle } from '~/components/ui/heartbeat-indicator';
import { HeartbeatIndicator } from '~/components/ui/heartbeat-indicator';
import { Spinner } from '~/components/ui/spinner';
import { useAuditLogStream } from '~/hooks/use-audit-log-stream';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { BulkActionsBar } from '../_components/bulk-actions-bar';
import { createColumns } from './columns';
import { FilterControls } from './filter-controls';
import { ViewAuditLogDialog } from './view-dialog';

type AuditLogWithUser = AuditLog & {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'> | null;
};

export function AuditLogsPageClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [selectedAuditLog, setSelectedAuditLog] =
    useState<AuditLogWithUser | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [result, setResult] = useState<'SUCCESS' | 'FAILURE' | 'all'>('all');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data, isLoading } = api.auditLog.get.useQuery({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: {
      search: search || undefined,
      action: action || undefined,
      resourceType: resourceType || undefined,
      result,
    },
    sorting,
  });

  const handleViewAuditLog = (auditLog: AuditLogWithUser) => {
    setSelectedAuditLog(auditLog);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewAuditLog);

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

  const utils = api.useUtils();

  const [newLogCount, setNewLogCount] = useState(0);
  const heartbeatRef = useRef<HeartbeatHandle>(null);

  const { connected } = useAuditLogStream({
    onNewLog: () => {
      setNewLogCount((c) => c + 1);
      utils.auditLog.get.invalidate();
      heartbeatRef.current?.spike();
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using pagination sub-fields as deps
  useEffect(() => {
    setRowSelection({});
  }, [pagination.pageIndex, pagination.pageSize]);

  const bulkDeleteMutation = api.auditLog.bulkDelete.useMutation({
    onSuccess: (deleteResult) => {
      utils.auditLog.get.invalidate();
      toast.success(`${deleteResult.count} denetim kaydı silindi`);
      setRowSelection({});
      setDeleteConfirmOpen(false);
    },
    onError: () => toast.error('Silme işlemi sırasında hata oluştu'),
  });

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls
            action={action}
            onAction={setAction}
            onResourceType={setResourceType}
            onResult={setResult}
            onSearch={setSearch}
            resourceType={resourceType}
            result={result}
            search={search}
          />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto flex items-center gap-2">
              Denetim Kayıtları
              <HeartbeatIndicator connected={connected} ref={heartbeatRef} />
            </CardTitle>
            <div className="text-right text-muted-foreground text-sm">
              <div>{data?.pagination?.totalItems ?? 0} kayıt</div>
              {newLogCount > 0 && (
                <div className="text-green-500 text-xs">
                  Sayfa açıldığından beri {newLogCount} kayıt geldi
                </div>
              )}
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
              onRowSelectionChange={setRowSelection}
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              rowSelection={rowSelection}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="audit-logs"
              totalCount={data?.pagination?.totalItems}
            />
          </div>
        )}

        {selectedAuditLog && (
          <ViewAuditLogDialog
            auditLog={selectedAuditLog}
            onOpenChange={setViewDialogOpen}
            open={viewDialogOpen}
          />
        )}

        <Dialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Toplu Silme</DialogTitle>
              <DialogDescription>
                {selectedIds.length} denetim kaydını silmek istediğinizden emin
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
