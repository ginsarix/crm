import { getDashboardConfig } from '~/server/lib/get-dashboard-config';

/**
 * Name of the currently configured "gray subtraction" business group, or
 * null if unset or passive. Its customer cards are excluded from every
 * dashboard calculation (totals, color counts, per-group stats) whenever no
 * more specific business-group filter is in effect — selecting the group
 * itself still shows its real numbers.
 */
export async function getActiveGraySubtractionBusinessGroupName(
  passiveNames: string[],
): Promise<string | null> {
  const config = await getDashboardConfig();
  const name = config?.graySubtractionBusinessGroup;
  return name && !passiveNames.includes(name) ? name : null;
}
