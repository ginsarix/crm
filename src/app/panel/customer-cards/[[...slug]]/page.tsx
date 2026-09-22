import { api, HydrateClient } from '~/trpc/server';
import { CustomerCardsPageClient } from '../page-client';

export default async function CustomerCardsPage() {
  const [, , , pageSizes] = await Promise.all([
    api.customerCard.get.prefetch({}),
    api.businessGroup.get.prefetch(),
    api.salesRepresentative.get.prefetch(),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <CustomerCardsPageClient pageSize={pageSizes.customerCard} />
    </HydrateClient>
  );
}
