import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LAYOUT_MODE_COOKIE_NAME } from '~/app/panel/announcements/layout-mode-cookie';
import { auth } from '~/server/better-auth';
import type { LayoutMode } from '~/shared/types/layout-mode';
import { api, HydrateClient } from '~/trpc/server';
import { AnnouncementsPageClient } from './page-client';

export default async function AnnouncementsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== 'admin') redirect('/panel/dashboard');

  await api.announcement.get.prefetch();

  const cookieStore = await cookies();
  const initialLayout =
    (cookieStore.get(LAYOUT_MODE_COOKIE_NAME)?.value as LayoutMode) || 'grid';

  return (
    <HydrateClient>
      <AnnouncementsPageClient initialLayoutMode={initialLayout} />
    </HydrateClient>
  );
}
