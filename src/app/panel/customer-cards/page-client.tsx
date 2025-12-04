'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { CustomerCard } from 'generated/prisma';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { createColumns } from './columns';
import { CreateCustomerCardDialog } from './create-dialog';
import { FilterControls } from './filter-controls';
import { ViewCustomerCardDialog } from './view-dialog';

export function CustomerCardsPageClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [selectedCustomerCard, setSelectedCustomerCard] =
    useState<CustomerCard | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [positive, setPositive] = useState<
    'positive' | 'negative' | 'neutral' | 'all'
  >('all');
  const [searchScope, setSearchScope] = useState<'all' | keyof CustomerCard>(
    'all',
  );

  const { data, isLoading } = api.customerCard.get.useQuery({
    page: pagination.pageIndex + 1, // Convert 0-based to 1-based for API
    itemsPerPage: pagination.pageSize,
    filter: {
      search,
      positive,
      searchScope,
    },
    sorting,
  });

  const handleViewCustomerCard = (customerCard: CustomerCard) => {
    setSelectedCustomerCard(customerCard);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewCustomerCard);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls
            onPositive={setPositive}
            onSearch={setSearch}
            onSearchScope={setSearchScope}
            positive={positive}
            search={search}
            searchScope={searchScope}
          />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">Cari Kartlar</CardTitle>
            <div className="ml-auto">
              <CreateCustomerCardDialog />
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
              tableId="customer-cards"
            />
          </div>
        )}

        {selectedCustomerCard && (
          <ViewCustomerCardDialog
            customerCard={selectedCustomerCard}
            onOpenChange={setViewDialogOpen}
            onUpdate={(updatedCustomerCard) =>
              setSelectedCustomerCard(updatedCustomerCard)
            }
            open={viewDialogOpen}
          />
        )}
      </div>
    </div>
  );
}
