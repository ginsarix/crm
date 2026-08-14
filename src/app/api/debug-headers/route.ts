import { headers } from 'next/headers';
import { auth } from '~/server/better-auth';

export const dynamic = 'force-dynamic';

// Temporary: diagnosing prod IP resolution (better-auth landing every
// request on the "unknown" ipAddress sentinel). Remove once confirmed fixed.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  const h = await headers();
  return Response.json({
    'x-forwarded-for': h.get('x-forwarded-for'),
    'x-real-ip': h.get('x-real-ip'),
    'cf-connecting-ip': h.get('cf-connecting-ip'),
    'x-vercel-forwarded-for': h.get('x-vercel-forwarded-for'),
    all: Object.fromEntries(h.entries()),
  });
}
