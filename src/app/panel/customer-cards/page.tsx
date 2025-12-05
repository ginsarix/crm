import { api, HydrateClient } from '~/trpc/server';
import { CustomerCardsPageClient } from './page-client';

export default async function CustomerCardsPage() {
  await Promise.all([
    api.customerCard.get.prefetch({}),
    api.businessGroup.get.prefetch(),
    api.salesRepresentative.get.prefetch(),
  ]);

  return (
    <HydrateClient>
      <CustomerCardsPageClient />
    </HydrateClient>
  );
}
