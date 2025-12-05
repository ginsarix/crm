'use client';
import type { BusinessGroup } from 'generated/prisma';
import { useState } from 'react';
import { DataTable } from '~/app/_components/data-table';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { createColumns } from './business-groups-columns';
import { CreateBusinessGroupDialog } from './create-business-group-dialog';
import { ViewBusinessGroupDialog } from './view-business-group-dialog';

export default function BusinessGroupsTable() {
  const { data, isLoading } = api.businessGroup.get.useQuery();

  const [selectedBusinessGroup, setSelectedBusinessGroup] =
    useState<BusinessGroup | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const handleViewBusinessGroup = (businessGroup: BusinessGroup) => {
    setSelectedBusinessGroup(businessGroup);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewBusinessGroup);
  return (
    <div>
      <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
        <CardHeader className="flex flex-row items-center">
          <CardTitle className="mr-auto">Meslek Grupları</CardTitle>
          <div className="ml-auto">
            <CreateBusinessGroupDialog />
          </div>
        </CardHeader>
      </Card>
      <DataTable
        columns={columns}
        data={data ?? []}
        tableId="business-groups"
      />

      {selectedBusinessGroup && (
        <ViewBusinessGroupDialog
          businessGroup={selectedBusinessGroup}
          onOpenChange={setViewDialogOpen}
          onUpdate={(updatedBusinessGroup) =>
            setSelectedBusinessGroup(updatedBusinessGroup)
          }
          open={viewDialogOpen}
        />
      )}
    </div>
  );
}
