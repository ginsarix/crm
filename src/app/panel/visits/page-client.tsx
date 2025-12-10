'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { Visit } from 'generated/prisma';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { createColumns } from './columns';
import { CreateVisitDialog } from './create-dialog';
import { FilterControls } from './filter-controls';
import RelatedVisitsDialog from './related-visits-dialog';
import { ViewVisitDialog } from './view-dialog';

export function VisitsPageClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [via, setVia] = useState<
    'phone' | 'inPerson' | 'email' | 'sms' | 'all'
  >('all');
  const [searchScope, setSearchScope] = useState<'all' | keyof Visit>('all');

  const { data, isLoading } = api.visit.get.useQuery({
    page: pagination.pageIndex + 1, // Convert 0-based to 1-based for API
    itemsPerPage: pagination.pageSize,
    filter: {
      search,
      via,
      searchScope,
    },
    sorting,
  });

  const handleViewVisit = (visit: Visit) => {
    setSelectedVisit(visit);
    setViewDialogOpen(true);
  };

  const pathname = useParams();
  const customerCardId = pathname.slug?.[0];

  const relatedVisits = useMemo(
    () =>
      customerCardId && data?.data
        ? data.data.filter((visit) => visit.customerCardId === customerCardId)
        : [],
    [data?.data, customerCardId],
  );

  const columns = createColumns(handleViewVisit);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls
            onSearch={setSearch}
            onSearchScope={setSearchScope}
            onVia={setVia}
            search={search}
            searchScope={searchScope}
            via={via}
          />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">Ziyaretler</CardTitle>
            <div className="ml-auto">
              <CreateVisitDialog />
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
              tableId="visits"
            />
          </div>
        )}

        {selectedVisit && (
          <ViewVisitDialog
            onOpenChange={setViewDialogOpen}
            onUpdate={(updatedVisit) => setSelectedVisit(updatedVisit)}
            open={viewDialogOpen}
            visit={selectedVisit}
          />
        )}

        {customerCardId && relatedVisits.length > 0 && (
          <RelatedVisitsDialog visits={relatedVisits} />
        )}
      </div>
    </div>
  );
}
