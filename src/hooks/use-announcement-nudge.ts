import { useCallback, useEffect, useState } from 'react';

const SEEN_ANNOUNCEMENTS_STORAGE_KEY = 'seen-announcement-ids';
const LAST_NUDGE_DATE_STORAGE_KEY = 'announcement-nudge-last-shown';
const MAX_TRACKED_IDS = 200;

export interface NudgeableAnnouncement {
  id: string;
  start: Date | null;
}

// Keyed by id + start, not just id, so republishing an announcement (via
// "Şimdi Yayınla" or reschedule, which reuse the same row) changes its key and
// makes it look unseen again — admins don't need to delete/recreate to re-nudge.
function seenKey(announcement: NudgeableAnnouncement): string {
  return `${announcement.id}:${announcement.start ? new Date(announcement.start).getTime() : 'null'}`;
}

function readSeenKeys(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_ANNOUNCEMENTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// Local calendar day (not UTC), so the daily reset lines up with the user's clock.
function todayKey(): string {
  return new Date().toDateString();
}

function readLastShownDate(): string | null {
  try {
    return localStorage.getItem(LAST_NUDGE_DATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useAnnouncementNudge(
  liveAnnouncements: NudgeableAnnouncement[] | undefined,
) {
  const [nudgeActive, setNudgeActive] = useState(false);

  useEffect(() => {
    if (!liveAnnouncements || liveAnnouncements.length === 0) return;
    const seen = readSeenKeys();
    const hasUnseen = liveAnnouncements.some((a) => !seen.includes(seenKey(a)));
    const shownToday = readLastShownDate() === todayKey();
    if (hasUnseen || !shownToday) setNudgeActive(true);
  }, [liveAnnouncements]);

  const dismissNudge = useCallback(() => {
    if (liveAnnouncements && liveAnnouncements.length > 0) {
      const seen = readSeenKeys();
      const merged = Array.from(
        new Set([...seen, ...liveAnnouncements.map(seenKey)]),
      ).slice(-MAX_TRACKED_IDS);
      localStorage.setItem(
        SEEN_ANNOUNCEMENTS_STORAGE_KEY,
        JSON.stringify(merged),
      );
    }
    try {
      localStorage.setItem(LAST_NUDGE_DATE_STORAGE_KEY, todayKey());
    } catch {}
    setNudgeActive(false);
  }, [liveAnnouncements]);

  return { nudgeActive, dismissNudge };
}
