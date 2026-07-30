import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '~/server/better-auth';
import { api, HydrateClient } from '~/trpc/server';
import { BusinessGroupCardsPageClient } from './page-client';

export default async function BusinessGroupCardsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== 'admin') redirect('/panel/dashboard');

  await api.businessGroupCard.get.prefetch({});

  return (
    <HydrateClient>
      <BusinessGroupCardsPageClient />
    </HydrateClient>
  );
}
