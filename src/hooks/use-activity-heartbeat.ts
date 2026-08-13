import { useEffect, useRef } from 'react';
import {
  HEARTBEAT_INTERVAL_SECONDS,
  IDLE_TIMEOUT_SECONDS,
} from '~/constants/activity';
import { api } from '~/trpc/react';

const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
] as const;

// Pings the server roughly every 30s while the tab is visible and the user
// has interacted recently. Each accepted ping credits a fixed amount of
// server-side time — nothing about "how long" is trusted from the client.
export function useActivityHeartbeat() {
  const { mutate: sendHeartbeat } = api.activity.heartbeat.useMutation();
  const lastActiveAtRef = useRef(Date.now());

  useEffect(() => {
    const markActive = () => {
      lastActiveAtRef.current = Date.now();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActive, { passive: true });
    }

    const intervalId = setInterval(() => {
      const isVisible = document.visibilityState === 'visible';
      const isActive =
        Date.now() - lastActiveAtRef.current < IDLE_TIMEOUT_SECONDS * 1000;

      if (isVisible && isActive) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActive);
      }
      clearInterval(intervalId);
    };
  }, [sendHeartbeat]);
}
