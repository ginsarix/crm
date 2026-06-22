'use client';

import { useEffect, useRef, useState } from 'react';
import type { AuditLogStreamEvent } from '~/app/api/audit-logs/stream/route';

type Options = {
  onNewLog: () => void;
};

export function useAuditLogStream({ onNewLog }: Options) {
  const [connected, setConnected] = useState(true);
  const onNewLogRef = useRef(onNewLog);
  onNewLogRef.current = onNewLog;

  useEffect(() => {
    const es = new EventSource('/api/audit-logs/stream');

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as AuditLogStreamEvent;
        if (event.type === 'new-log') onNewLogRef.current();
      } catch {
        // malformed event — ignore
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  return { connected };
}
