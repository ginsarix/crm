'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { User } from 'generated/prisma';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { FilterControls } from './filter-controls';
import { ReportActionsDialog } from './report-actions-dialog';
import { createReportColumns } from './report-columns';
import { IpBreakdownTable } from './report-ip-breakdown';

interface ActionsTarget {
  userId: string;
  userName: string;
  ipAddress?: string;
}

export function UserReportTab() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | keyof User>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  // actionsTarget holds the modal's data and is intentionally NOT cleared on
  // close — only actionsOpen toggles, so ReportActionsDialog's close
  // animation can play instead of the modal unmounting mid-transition. Same
  // split as ViewUserDialog's selectedUser/viewDialogOpen pair above.
  const [actionsTarget, setActionsTarget] = useState<ActionsTarget | null>(
    null,
  );
  const [actionsOpen, setActionsOpen] = useState(false);

  const { data, isLoading } = api.userReport.get.useQuery({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: { search, searchScope },
    sorting,
  });

  const openActions = (target: ActionsTarget) => {
    setActionsTarget(target);
    setActionsOpen(true);
  };

  const columns = createReportColumns(
    expandedUserId,
    (userId) =>
      setExpandedUserId((current) => (current === userId ? null : userId)),
    (userId, userName) => openActions({ userId, userName }),
  );

  return (
    <div>
      <div className="mb-4">
        <FilterControls
          onSearch={setSearch}
          onSearchScope={setSearchScope}
          search={search}
          searchScope={searchScope}
        />
      </div>
      <Card className={isLoading ? undefined : 'rounded-b-none border-b-0'}>
        <CardHeader>
          <CardTitle>Kullanıcı Raporu</CardTitle>
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
            renderSubRow={(row) =>
              row.id === expandedUserId ? (
                <IpBreakdownTable
                  onOpenActions={(userId, userName, ipAddress) =>
                    openActions({ userId, userName, ipAddress })
                  }
                  userId={row.id}
                  userName={row.name}
                />
              ) : null
            }
            setPagination={setPagination}
            setSorting={setSorting}
            sorting={sorting}
            tableId="user-report"
            totalCount={data?.pagination?.totalItems}
          />
        </div>
      )}

      {actionsTarget && (
        <ReportActionsDialog
          ipAddress={actionsTarget.ipAddress}
          onOpenChange={setActionsOpen}
          open={actionsOpen}
          userId={actionsTarget.userId}
          userName={actionsTarget.userName}
        />
      )}
    </div>
  );
}
