import { APIError, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { env } from '~/env';
import { auditLogEmitter } from '~/server/audit-log-emitter';
import { db } from '~/server/db';
import { normalizeIp } from '~/server/lib/normalize-ip';
import { getDeviceUuid, resolveDeviceId } from '~/server/lib/resolve-device-id';
import { getVerificationEmailHtml, sendEmail } from './email';

// Audit log helper for auth events
async function createAuthAuditLog(
  userId: string | undefined,
  ipAddress: string | null | undefined,
  deviceId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  result: 'SUCCESS' | 'FAILURE',
  error: string | undefined,
  details?: string,
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        ipAddress: normalizeIp(ipAddress),
        deviceId,
        action,
        resourceType,
        resourceId,
        result,
        error,
        details,
      },
    });
    auditLogEmitter.emit('new-log');
  } catch (err) {
    console.error('Auth audit log failed:', err);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  baseURL: env.CROSS_ORIGIN_URL ?? 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 14 * 24 * 60 * 60, // 14 days

    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'E-posta Adresinizi Doğrulayın',
        html: getVerificationEmailHtml(url, user.name),
      });
    },
  },

  session: {
    expiresIn: 15 * 60, // 15 mins: slide forward by this much on update
    updateAge: 0, // Every request resets the 15 min clock
    cookieCache: {
      enabled: true,
      // Kept short: a longer cache means a session revoked elsewhere (e.g.
      // by single-session enforcement below) stays valid on this device for
      // up to this long before the next request re-checks the DB.
      maxAge: 15,
    },
  },
  trustedOrigins: env.CROSS_ORIGIN_URL ? [env.CROSS_ORIGIN_URL] : [],
  advanced: {
    ipAddress: {
      // Plesk's nginx front end sets this to the real client IP
      // ($remote_addr) unconditionally, unlike x-forwarded-for which is a
      // multi-hop chain that better-auth (since v1.6.21) refuses to trust
      // without a configured proxy list — leaving every request resolving
      // to the "unknown" sentinel otherwise.
      ipAddressHeaders: ['x-real-ip'],
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Fires for every session row, including admin impersonation and the
        // session refresh after a password change. Path-filter to the two
        // endpoints that represent an actual user login.
        after: async (session, context) => {
          if (
            context?.path !== '/sign-in/email' &&
            context?.path !== '/verify-email'
          ) {
            return;
          }
          const ipAddress = normalizeIp(session.ipAddress);
          const userAgent = session.userAgent ?? null;
          const deviceUuid = context?.headers
            ? getDeviceUuid(context.headers)
            : null;
          try {
            const deviceId = await resolveDeviceId(
              deviceUuid,
              session.userId,
              userAgent,
            );
            if (deviceId) {
              await db.device.update({
                where: { id: deviceId },
                data: { lastUserAgent: userAgent ?? undefined },
              });
            }
            await db.loginEvent.create({
              data: {
                userId: session.userId,
                ipAddress,
                userAgent,
                deviceId,
              },
            });
            await db.user.update({
              where: { id: session.userId },
              data: { lastLoginAt: session.createdAt },
            });
          } catch (err) {
            console.error('Failed to record login event:', err);
          }
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path;
      const response = ctx.context.returned as
        | APIError
        | { user?: { id: string; email: string; name: string } }
        | null;

      // Handle error responses
      if (response instanceof APIError || (response && 'body' in response)) {
        const errorResponse = response as APIError;

        if (
          path.startsWith('/sign-up') &&
          errorResponse.body?.code === 'USER_ALREADY_EXISTS'
        ) {
          throw new APIError('BAD_REQUEST', {
            ...errorResponse.body,
            message: 'Bu kullanıcı zaten mevcut',
          });
        }
        if (
          path.startsWith('/sign-in') &&
          errorResponse.body?.code === 'INVALID_EMAIL_OR_PASSWORD'
        ) {
          throw new APIError('UNAUTHORIZED', {
            ...errorResponse.body,
            message: 'E-posta veya parola yanlış',
          });
        }
        if (
          path.startsWith('/sign-in') &&
          errorResponse.body?.code === 'EMAIL_NOT_VERIFIED'
        ) {
          throw new APIError('FORBIDDEN', {
            ...errorResponse.body,
            message: 'E-posta adresinizi doğrulamanız gerekiyor',
          });
        }
        if (
          path.startsWith('/change-password') &&
          errorResponse.body?.code === 'INVALID_PASSWORD'
        ) {
          throw new APIError('BAD_REQUEST', {
            ...errorResponse.body,
            message: 'Parola yanlış',
          });
        }
      }

      // Handle successful responses
      if (
        path === '/sign-in/email' &&
        response &&
        'user' in response &&
        response.user
      ) {
        const loginDeviceId = await resolveDeviceId(
          ctx.headers ? getDeviceUuid(ctx.headers) : null,
          response.user.id,
          ctx.headers?.get('user-agent'),
        );
        await createAuthAuditLog(
          response.user.id,
          ctx.context.newSession?.session.ipAddress,
          loginDeviceId,
          'USER_LOGIN',
          'USER',
          response.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı giriş yaptı: ${response.user.name} (${response.user.email})`,
        );

        // Single-session enforcement: a new login ends every other active
        // session for the user, so signing in on one device signs the user
        // out everywhere else.
        const newSessionToken = ctx.context.newSession?.session.token;
        if (newSessionToken) {
          const sessions = await ctx.context.internalAdapter.listSessions(
            response.user.id,
            { onlyActiveSessions: true },
          );
          const otherTokens = sessions
            .map((s) => s.token)
            .filter((token) => token !== newSessionToken);
          if (otherTokens.length > 0) {
            await ctx.context.internalAdapter.deleteSessions(otherTokens);
          }
        }
      }

      // NOTE: this branch is not currently reachable — better-auth's
      // /sign-out endpoint never populates ctx.context.session (confirmed
      // by reading node_modules/better-auth/dist/api/routes/sign-out.mjs),
      // so USER_LOGOUT audit logging never fires today. Pre-existing gap,
      // unrelated to device tracking — kept correct here in case the
      // underlying issue is ever fixed upstream or in this app's own auth
      // config.
      if (path === '/sign-out' && ctx.context.session?.user) {
        const logoutDeviceId = await resolveDeviceId(
          ctx.headers ? getDeviceUuid(ctx.headers) : null,
          ctx.context.session.user.id,
          ctx.headers?.get('user-agent'),
        );
        await createAuthAuditLog(
          ctx.context.session.user.id,
          ctx.context.session.session.ipAddress,
          logoutDeviceId,
          'USER_LOGOUT',
          'USER',
          ctx.context.session.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı çıkış yaptı: ${ctx.context.session.user.name} (${ctx.context.session.user.email})`,
        );
      }
    }),
  },

  plugins: [admin(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
