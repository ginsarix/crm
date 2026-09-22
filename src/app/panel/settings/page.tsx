import { headers } from 'next/headers';
import { auth } from '~/server/better-auth';
import { api, HydrateClient } from '~/trpc/server';
import SaleRepresentativesTable from './sale-representatives-table';
import { SettingsTabs } from './settings-tabs';

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = session?.user?.role === 'admin';
  const [labels, pageSizes] = await Promise.all([
    api.label.get(),
    api.pageSize.get(),
  ]);

  const prefetches = [
    api.salesRepresentative.getPaginated.prefetch({
      page: 1,
      itemsPerPage: pageSizes.salesRepresentative.defaultValue,
      filter: { search: '' },
      sorting: [],
    }),
  ];
  if (isAdmin) prefetches.push(api.businessGroup.get.prefetch());
  await Promise.all(prefetches);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6">
          <h2 className="font-bold text-3xl tracking-tight">
            {labels.page.settings}
          </h2>
          <p className="text-muted-foreground">
            Genel ayarlar, tanımlar ve tercihler
          </p>
        </div>

        <HydrateClient>
          {isAdmin ? (
            <SettingsTabs pageSizes={pageSizes} />
          ) : (
            <SaleRepresentativesTable
              pageSize={pageSizes.salesRepresentative}
            />
          )}
        </HydrateClient>
      </div>
    </div>
  );
}
