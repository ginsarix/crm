import { headers } from 'next/headers';
import { auth } from '~/server/better-auth';
import { api, HydrateClient } from '~/trpc/server';
import BusinessGroupsTable from './business-groups-table';
import SaleRepresentativesTable from './sale-representatives-table';

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = session?.user?.role === 'admin';

  const prefetches = [api.salesRepresentative.get.prefetch()];
  if (isAdmin) prefetches.push(api.businessGroup.get.prefetch());
  await Promise.all(prefetches);

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
          <div className={isAdmin ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : ''}>
            <SaleRepresentativesTable />
            {isAdmin && <BusinessGroupsTable />}
          </div>
        </HydrateClient>
      </div>
    </div>
  );
}
