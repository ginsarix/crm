'use client';

import { useActivityHeartbeat } from '~/hooks/use-activity-heartbeat';

// Renders nothing — just keeps the heartbeat running for as long as an
// authenticated page is mounted. See src/server/activity-tracker.ts.
export function ActivityTracker() {
  useActivityHeartbeat();
  return null;
}
