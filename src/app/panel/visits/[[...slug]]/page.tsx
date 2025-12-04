import { api, HydrateClient } from '~/trpc/server';
import { VisitsPageClient } from '../page-client';

export default async function VisitsPage() {
  await api.visit.get.prefetch({});

  return (
    <HydrateClient>
      <VisitsPageClient />
    </HydrateClient>
  );
}
