'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { AuditLog, User } from 'generated/prisma';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
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
    pageSize: 20,
  });
  const [selectedAuditLog, setSelectedAuditLog] =
    useState<AuditLogWithUser | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [result, setResult] = useState<'SUCCESS' | 'FAILURE' | 'all'>('all');

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
            <CardTitle className="mr-auto">Denetim Kayıtları</CardTitle>
            <div className="text-muted-foreground text-sm">
              {data?.pagination?.totalItems ?? 0} kayıt
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
              columns={columns}
              data={data?.data ?? []}
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="audit-logs"
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
      </div>
    </div>
  );
}
