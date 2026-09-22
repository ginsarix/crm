import { api, HydrateClient } from '~/trpc/server';
import { VisitsPageClient } from '../page-client';

export default async function VisitsPage() {
  const [, pageSizes] = await Promise.all([
    api.visit.get.prefetch({}),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <VisitsPageClient pageSize={pageSizes.visit} />
    </HydrateClient>
  );
}
