'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { useHeartbeat } from '~/hooks/use-heartbeat';

export type HeartbeatHandle = { spike: () => void };

export const HeartbeatIndicator = forwardRef<
  HeartbeatHandle,
  { connected: boolean }
>(({ connected }, ref) => {
  const { canvasRef, spike } = useHeartbeat(connected);

  useImperativeHandle(ref, () => ({ spike }), [spike]);

  return <canvas height={24} ref={canvasRef} width={80} />;
});

HeartbeatIndicator.displayName = 'HeartbeatIndicator';
