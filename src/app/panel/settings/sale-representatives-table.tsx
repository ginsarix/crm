'use client';
import type { SalesRepresentative } from 'generated/prisma';
import { useState } from 'react';
import { DataTable } from '~/app/_components/data-table';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { CreateSaleRepresentativeDialog } from './create-sale-representative-dialog';
import { createColumns } from './sale-representatives-columns';
import { ViewSaleRepresentativeDialog } from './view-sale-representative-dialog';

export default function SaleRepresentativesTable() {
  const { data, isLoading } = api.salesRepresentative.get.useQuery();

  const [selectedSalesRepresentative, setSelectedSalesRepresentative] =
    useState<SalesRepresentative | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const handleViewSalesRepresentative = (
    salesRepresentative: SalesRepresentative,
  ) => {
    setSelectedSalesRepresentative(salesRepresentative);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewSalesRepresentative);
  return (
    <div>
      <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
        <CardHeader className="flex flex-row items-center">
          <CardTitle className="mr-auto">Satış Temsilcileri</CardTitle>
          <div className="ml-auto">
            <CreateSaleRepresentativeDialog />
          </div>
        </CardHeader>
      </Card>
      <DataTable
        columns={columns}
        data={data ?? []}
        tableId="sale-representatives"
      />

      {selectedSalesRepresentative && (
        <ViewSaleRepresentativeDialog
          onOpenChange={setViewDialogOpen}
          onUpdate={(updatedSalesRepresentative) =>
            setSelectedSalesRepresentative(updatedSalesRepresentative)
          }
          open={viewDialogOpen}
          salesRepresentative={selectedSalesRepresentative}
        />
      )}
    </div>
  );
}
