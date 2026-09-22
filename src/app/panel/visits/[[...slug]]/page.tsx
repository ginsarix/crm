import { DEFAULT_PAGE_SIZES } from '~/shared/page-sizes/resolve';
import { api, HydrateClient } from '~/trpc/server';
import { VisitsPageClient } from '../page-client';

export default async function VisitsPage() {
  const [, pageSizes] = await Promise.all([
    api.visit.get.prefetch({}),
    // `api.pageSize.get()` is a direct call, not a prefetch — unlike the
    // prefetch beside it, a rejection here would reject the whole
    // Promise.all and throw the render. This route has no server-side
    // session guard and relies on the client redirecting an expired
    // session, which only happens if the page renders at all. Fall back to
    // the built-in defaults so an auth failure stays a redirect instead of
    // becoming an error page.
    api.pageSize.get().catch(() => DEFAULT_PAGE_SIZES),
  ]);

  return (
    <HydrateClient>
      <VisitsPageClient pageSize={pageSizes.visit} />
    </HydrateClient>
  );
}
