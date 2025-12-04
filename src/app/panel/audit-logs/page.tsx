import { api, HydrateClient } from '~/trpc/server';
import { AuditLogsPageClient } from './page-client';

export default async function AuditLogsPage() {
  await api.auditLog.get.prefetch({});

  return (
    <HydrateClient>
      <AuditLogsPageClient />
    </HydrateClient>
  );
}
