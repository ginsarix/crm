import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '~/server/better-auth';
import { api, HydrateClient } from '~/trpc/server';
import { AuditLogsPageClient } from './page-client';

export default async function AuditLogsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== 'admin') redirect('/panel/dashboard');

  const [, pageSizes] = await Promise.all([
    api.auditLog.get.prefetch({}),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <AuditLogsPageClient pageSize={pageSizes.auditLog} />
    </HydrateClient>
  );
}
