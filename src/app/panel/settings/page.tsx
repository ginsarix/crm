import { api, HydrateClient } from '~/trpc/server';
import BusinessGroupsTable from './business-groups-table';
import SaleRepresentativesTable from './sale-representatives-table';

export default async function SettingsPage() {
  await Promise.all([
    api.salesRepresentative.get.prefetch(),
    api.businessGroup.get.prefetch(),
  ]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6">
          <h2 className="font-bold text-3xl tracking-tight">Ayarlar</h2>
          <p className="text-muted-foreground">
            Genel ayarlar, tanımlar ve tercihler
          </p>
        </div>

        <HydrateClient>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SaleRepresentativesTable />
            <BusinessGroupsTable />
          </div>
        </HydrateClient>
      </div>
    </div>
  );
}
