'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { AuditLog, User } from 'generated/prisma';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Spinner } from '~/components/ui/spinner';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { createColumns } from '../audit-logs/columns';
import { ViewAuditLogDialog } from '../audit-logs/view-dialog';

type AuditLogWithUser = AuditLog & {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'> | null;
};

interface ReportActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  ipAddress?: string;
}

export function ReportActionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  ipAddress,
}: ReportActionsDialogProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [selectedAuditLog, setSelectedAuditLog] =
    useState<AuditLogWithUser | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data, isLoading } = api.auditLog.get.useQuery(
    {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      filter: { userId, ipAddress },
      sorting,
    },
    { enabled: open },
  );

  const columns = createColumns((auditLog) => {
    setSelectedAuditLog(auditLog);
    setViewDialogOpen(true);
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1100px]">
        <DialogHeader>
          <DialogTitle>
            {ipAddress
              ? `${userName} — ${ipAddress} Eylemleri`
              : `${userName} — Tüm Eylemler`}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner className="size-8" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            pageCount={data?.pagination?.totalPages ?? -1}
            pagination={pagination}
            setPagination={setPagination}
            setSorting={setSorting}
            sorting={sorting}
            tableId="report-actions"
            totalCount={data?.pagination?.totalItems}
          />
        )}

        {selectedAuditLog && (
          <ViewAuditLogDialog
            auditLog={selectedAuditLog}
            onOpenChange={setViewDialogOpen}
            open={viewDialogOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
