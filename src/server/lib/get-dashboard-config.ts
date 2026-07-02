import { unstable_cache } from 'next/cache';
import { db } from '~/server/db';

export const getDashboardConfig = unstable_cache(
  async () => db.dashboardConfig.findUnique({ where: { id: 'singleton' } }),
  ['dashboard-config'],
  {
    revalidate: 60,
    tags: ['dashboard-config'],
  },
);
