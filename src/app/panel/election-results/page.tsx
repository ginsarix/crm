import { api, HydrateClient } from '~/trpc/server';
import { ElectionResultsPageClient } from './page-client';

// No role guard on purpose: this page is visible and editable to every role.
export default async function ElectionResultsPage() {
  await api.electionResult.get.prefetch({});

  return (
    <HydrateClient>
      <ElectionResultsPageClient />
    </HydrateClient>
  );
}
