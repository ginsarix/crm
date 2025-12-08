'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { AuditLog, User } from 'generated/prisma';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import type { RouterInputs } from '~/trpc/types';
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

  type unitType = RouterInputs['auditLog']['clearLogs']['unit'];

  const clearOptionsSchema = z.object({
    amount: z.number().int().positive(),
    unit: z.enum(['hours', 'days', 'months', 'years']),
  });

  const [clearOptions, setClearOptions] = useState<{
    amount: string;
    unit: unitType | '';
  }>({
    amount: '',
    unit: '',
  });

  const utils = api.useUtils();

  const clearMutation = api.auditLog.clearLogs.useMutation({
    onSuccess: () => {
      toast.success('Loglar temizlendi');
      utils.auditLog.get.invalidate();
    },
    onError: () => {
      toast.error('Loglar temizlenemedi');
    },
  });

  const clearSubmitHandler = () => {
    const result = clearOptionsSchema.safeParse({
      amount: Number(clearOptions.amount),
      unit: clearOptions.unit,
    });
    if (!result.success) {
      toast.error('Geçersiz miktar veya birim');
      return;
    }

    clearMutation.mutate({
      amount: result.data.amount,
      unit: result.data.unit,
    });
  };
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
            <div className="me-5 flex gap-2">
              <Input
                inputMode="numeric"
                maxLength={10}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!/^\d*$/.test(value)) return;

                  setClearOptions((prev) => ({
                    ...prev,
                    amount: value,
                  }));
                }}
                placeholder="Miktar"
                value={clearOptions.amount}
              />
              <Select
                onValueChange={(v) =>
                  setClearOptions((prev) => ({
                    ...prev,
                    unit: v as unitType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zaman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Saat</SelectItem>
                  <SelectItem value="days">Gün</SelectItem>
                  <SelectItem value="months">Ay</SelectItem>
                  <SelectItem value="years">Yıl</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="cursor-pointer border-destructive/90 text-destructive/90 hover:bg-destructive/10 hover:text-destructive"
                disabled={clearMutation.isPending}
                onClick={clearSubmitHandler}
                variant="outline"
              >
                Temizle
              </Button>
            </div>
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
