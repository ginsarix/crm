import { api, HydrateClient } from '~/trpc/server';
import { UsersPageClient } from './page-client';

export default async function UsersPage() {
  await api.user.get.prefetch({});

  return (
    <HydrateClient>
      <UsersPageClient />
    </HydrateClient>
  );
}
