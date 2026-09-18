'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { useLabels } from '~/hooks/use-labels';
import { cn } from '~/lib/utils';
import { labelCompose } from '~/shared/labels/compose';
import { api } from '~/trpc/react';

import { DataTable } from '../../_components/data-table';
import { createColumns } from './columns';
import { FilterControls } from './filter-controls';

export function ElectionResultsPageClient() {
  const labels = useLabels();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState('');

  const { data, isLoading } = api.electionResult.get.useQuery({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: { search },
    sorting,
  });

  const columns = createColumns(labels);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls onSearch={setSearch} search={search} />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">
              {labelCompose.tableTitle(labels.entity.electionResult)}
            </CardTitle>
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
              exportFilename="secim_sonuclari"
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="election-results"
              totalCount={data?.pagination?.totalItems}
            />
          </div>
        )}
      </div>
    </div>
  );
}
