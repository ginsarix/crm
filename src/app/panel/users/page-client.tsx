'use client';

import type {
  PaginationState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import type { User } from 'generated/prisma';
import { Trash2 } from 'lucide-react';

import { useEffect, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { BulkActionsBar } from '../_components/bulk-actions-bar';
import { createColumns } from './columns';
import { CreateUserDialog } from './create-dialog';
import { FilterControls } from './filter-controls';
import { UserReportTab } from './report-tab';
import { ViewUserDialog } from './view-dialog';

export function UsersPageClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | keyof User>('all');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const utils = api.useUtils();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using pagination sub-fields as deps
  useEffect(() => {
    setRowSelection({});
  }, [pagination.pageIndex, pagination.pageSize]);

  const bulkDeleteMutation = api.user.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.user.get.invalidate();
      utils.user.getTotal.invalidate();
      const msg =
        result.skipped > 0
          ? `${result.count} kullanıcı silindi (kendi hesabınız atlandı)`
          : `${result.count} kullanıcı silindi`;
      toast.success(msg);
      setRowSelection({});
      setDeleteConfirmOpen(false);
    },
    onError: () => toast.error('Silme işlemi sırasında hata oluştu'),
  });

  const userQueryInput = {
    page: pagination.pageIndex + 1, // Convert 0-based to 1-based for API
    itemsPerPage: pagination.pageSize,
    filter: {
      search,
      searchScope,
    },
    sorting,
  };

  const { data, isLoading } = api.user.get.useQuery(userQueryInput);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewUser);

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

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
            <TabsTrigger value="report">Kullanıcı Raporu</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="mb-4">
              <FilterControls
                onSearch={setSearch}
                onSearchScope={setSearchScope}
                search={search}
                searchScope={searchScope}
              />
            </div>
            <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
              <CardHeader className="flex flex-row items-center">
                <CardTitle className="mr-auto">Kullanıcılar</CardTitle>
                <div className="ml-auto">
                  <CreateUserDialog />
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
                  exportFilename="kullanıcılar"
                  onRowSelectionChange={setRowSelection}
                  pageCount={data?.pagination?.totalPages ?? -1}
                  pagination={pagination}
                  rowSelection={rowSelection}
                  setPagination={setPagination}
                  setSorting={setSorting}
                  sorting={sorting}
                  tableId="users"
                  totalCount={data?.pagination?.totalItems}
                />
              </div>
            )}

            {selectedUser && (
              <ViewUserDialog
                onOpenChange={setViewDialogOpen}
                onUpdate={(updatedUser) => {
                  setSelectedUser(updatedUser);
                  if (pagination.pageSize === 500) {
                    // Largest page size — avoid re-fetching all 500 rows on
                    // every save, patch the already-cached page instead
                    utils.user.get.setData(userQueryInput, (old) =>
                      old
                        ? {
                            ...old,
                            data: old.data.map((u) =>
                              u.id === updatedUser.id ? updatedUser : u,
                            ),
                          }
                        : old,
                    );
                  } else {
                    utils.user.get.invalidate();
                  }
                }}
                open={viewDialogOpen}
                user={selectedUser}
              />
            )}

            <Dialog
              onOpenChange={setDeleteConfirmOpen}
              open={deleteConfirmOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Toplu Silme</DialogTitle>
                  <DialogDescription>
                    {selectedIds.length} kullanıcıyı silmek istediğinizden emin
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
                    onClick={() =>
                      bulkDeleteMutation.mutate({ ids: selectedIds })
                    }
                    variant="destructive"
                  >
                    {bulkDeleteMutation.isPending
                      ? 'Siliniyor...'
                      : 'Evet, Sil'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="report">
            <UserReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
