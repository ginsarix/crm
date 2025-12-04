import { APIError, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { admin, createAuthMiddleware } from 'better-auth/plugins';
import { db } from '~/server/db';

// Audit log helper for auth events
async function createAuthAuditLog(
  userId: string | undefined,
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
        action,
        resourceType,
        resourceId,
        result,
        error,
        details,
      },
    });
  } catch (err) {
    console.error('Auth audit log failed:', err);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 15 * 60, // 15 mins: slide forward by this much on update
    updateAge: 15 * 60, // Update only after 15 mins of inactivity
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Short cache cookie (5 mins) for perf—refreshes often
      refreshCache: false, // Disable auto-refresh to enforce timeouts
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
        await createAuthAuditLog(
          response.user.id,
          'USER_LOGIN',
          'USER',
          response.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı giriş yaptı: ${response.user.name} (${response.user.email})`,
        );
      }

      if (path === '/sign-out' && ctx.context.session?.user) {
        await createAuthAuditLog(
          ctx.context.session.user.id,
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

  plugins: [nextCookies(), admin()],
});

export type Session = typeof auth.$Infer.Session;
