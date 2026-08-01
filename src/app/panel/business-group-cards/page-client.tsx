'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import type { columnMap } from '~/lib/column-map';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

import { DataTable } from '../../_components/data-table';
import type { BusinessGroupCardRow } from './columns';
import { createColumns } from './columns';
import { FilterControls } from './filter-controls';
import { ViewBusinessGroupCardDialog } from './view-dialog';

type BusinessGroupCardSearchScope =
  | 'all'
  | keyof typeof columnMap.businessGroupCard;

export function BusinessGroupCardsPageClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] =
    useState<BusinessGroupCardSearchScope>('all');

  const [selectedRow, setSelectedRow] = useState<BusinessGroupCardRow | null>(
    null,
  );
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const utils = api.useUtils();

  const businessGroupCardQueryInput = {
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: { search, searchScope },
    sorting,
  };

  const { data, isLoading } = api.businessGroupCard.get.useQuery(
    businessGroupCardQueryInput,
  );

  const handleView = (row: BusinessGroupCardRow) => {
    setSelectedRow(row);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleView);

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
            <CardTitle className="mr-auto">Meslek Grubu Kartları</CardTitle>
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
              defaultColumnVisibility={{
                uye2: false,
                uye3: false,
                uye4: false,
                uye5: false,
                yedekUye1: false,
                yedekUye2: false,
                yedekUye3: false,
                yedekUye4: false,
                yedekUye5: false,
                createdAt: false,
                updatedAt: false,
              }}
              exportFilename="meslek_grubu_kartlari"
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="business-group-cards"
              totalCount={data?.pagination?.totalItems}
            />
          </div>
        )}

        {selectedRow && (
          <ViewBusinessGroupCardDialog
            businessGroupCard={selectedRow}
            onOpenChange={setViewDialogOpen}
            onUpdate={(updated) => {
              setSelectedRow(updated);
              if (pagination.pageSize === 0) {
                // "Tümü" (fetch-all) mode — avoid re-fetching the whole
                // table on every save, patch the already-cancelled cache instead
                utils.businessGroupCard.get.setData(
                  businessGroupCardQueryInput,
                  (old) =>
                    old
                      ? {
                          ...old,
                          data: old.data.map((row) =>
                            row.id === updated.id
                              ? { ...row, ...updated }
                              : row,
                          ),
                        }
                      : old,
                );
              } else {
                utils.businessGroupCard.get.invalidate();
              }
            }}
            open={viewDialogOpen}
          />
        )}
      </div>
    </div>
  );
}
