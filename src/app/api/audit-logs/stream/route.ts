import { headers } from 'next/headers';
import { auditLogEmitter } from '~/server/audit-log-emitter';
import { auth } from '~/server/better-auth';

export const dynamic = 'force-dynamic';

export type AuditLogStreamEvent = { type: 'new-log' };

const encoder = new TextEncoder();

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: AuditLogStreamEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          cleanup?.();
        }
      };

      const handler = () => sendEvent({ type: 'new-log' });
      auditLogEmitter.on('new-log', handler);

      const heartbeatId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          cleanup?.();
        }
      }, 15_000);

      cleanup = () => {
        auditLogEmitter.off('new-log', handler);
        clearInterval(heartbeatId);
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
