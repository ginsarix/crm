import { api, HydrateClient } from '~/trpc/server';
import { ElectionResultsPageClient } from './page-client';

// No role guard on purpose: this page is visible and editable to every role.
export default async function ElectionResultsPage() {
  const [, pageSizes] = await Promise.all([
    api.electionResult.get.prefetch({}),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <ElectionResultsPageClient pageSize={pageSizes.electionResult} />
    </HydrateClient>
  );
}
