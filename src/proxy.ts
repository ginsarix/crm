import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  DEVICE_UUID_COOKIE,
  DEVICE_UUID_COOKIE_MAX_AGE_SECONDS,
  DEVICE_UUID_HEADER,
} from '~/constants/device';
import { auth } from '~/server/better-auth';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/panel')) {
    const session = await auth.api.getSession({ headers: await headers() });
    // THIS IS NOT SECURE!
    // This is the recommended approach to optimistically redirect users
    // We recommend handling auth checks in each page/route
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const existing = request.cookies.get(DEVICE_UUID_COOKIE)?.value;
  const deviceUuid = existing ?? crypto.randomUUID();

  // Forward the id upstream even on the very request that mints it — the
  // client won't have stored the Set-Cookie response yet, so downstream
  // code (better-auth hooks, tRPC context) reads this header instead of
  // ever parsing the request's raw Cookie header itself.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(DEVICE_UUID_HEADER, deviceUuid);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!existing) {
    response.cookies.set(DEVICE_UUID_COOKIE, deviceUuid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: DEVICE_UUID_COOKIE_MAX_AGE_SECONDS,
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|css|js|woff2?)$).*)',
  ],
};
