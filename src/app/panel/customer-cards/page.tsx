import { api, HydrateClient } from '~/trpc/server';
import { CustomerCardsPageClient } from './page-client';

export default async function CustomerCardsPage() {
  await api.customerCard.get.prefetch({});

  return (
    <HydrateClient>
      <CustomerCardsPageClient />
    </HydrateClient>
  );
}
