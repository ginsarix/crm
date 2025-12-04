'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { User } from 'generated/prisma';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { createColumns } from './columns';
import { CreateUserDialog } from './create-dialog';
import { FilterControls } from './filter-controls';
import { ViewUserDialog } from './view-dialog';

export function UsersPageClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | keyof User>('all');

  const { data, isLoading } = api.user.get.useQuery({
    page: pagination.pageIndex + 1, // Convert 0-based to 1-based for API
    itemsPerPage: pagination.pageSize,
    filter: {
      search,
      searchScope,
    },
    sorting,
  });

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewUser);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
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
              columns={columns}
              data={data?.data ?? []}
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="users"
            />
          </div>
        )}

        {selectedUser && (
          <ViewUserDialog
            onOpenChange={setViewDialogOpen}
            onUpdate={(updatedUser) => setSelectedUser(updatedUser)}
            open={viewDialogOpen}
            user={selectedUser}
          />
        )}
      </div>
    </div>
  );
}
