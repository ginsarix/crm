import type { PrismaClient } from 'generated/prisma';

/**
 * Names of business groups currently marked passive. Used to hard-exclude
 * their customer cards and visits everywhere, for every role — passive
 * groups are only reachable via the settings table and their own edit
 * dialog.
 */
export async function getPassiveBusinessGroupNames(
  db: PrismaClient,
): Promise<string[]> {
  const groups = await db.businessGroup.findMany({
    where: { passive: true },
    select: { name: true },
  });
  return groups.map((g) => g.name);
}
