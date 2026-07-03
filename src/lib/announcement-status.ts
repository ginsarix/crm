export type AnnouncementStatus = 'live' | 'scheduled' | 'draft' | 'expired';

export interface AnnouncementScheduleFields {
  start: Date | null;
  end: Date | null;
}

/**
 * Status is derived, never stored. A record with no start is a "draft"; one
 * whose start hasn't arrived yet is "scheduled"; past its end it's "expired";
 * otherwise it's "live" — whether that's because someone force-published it
 * (start was set to "now") or because a scheduled start simply arrived.
 */
export function getAnnouncementStatus(
  announcement: AnnouncementScheduleFields,
  now: Date = new Date(),
): AnnouncementStatus {
  const { start, end } = announcement;

  if (!start) return 'draft';
  if (start > now) return 'scheduled';
  if (end && end < now) return 'expired';
  return 'live';
}

/**
 * "Şimdi Yayınla" (publish now) preserves the original run duration instead of
 * just dropping the end date — the window slides forward to start "now".
 */
export function computePublishNowWindow(
  announcement: AnnouncementScheduleFields,
  now: Date = new Date(),
): { start: Date; end: Date | null } {
  const { start, end } = announcement;
  let nextEnd: Date | null = null;

  if (start && end) {
    const duration = end.getTime() - start.getTime();
    if (duration > 0) nextEnd = new Date(now.getTime() + duration);
  }

  return { start: now, end: nextEnd };
}
