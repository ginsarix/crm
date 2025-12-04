import { auditLogRouter } from '~/server/api/routers/audit-log';
import { customerCardRouter } from '~/server/api/routers/customer-card';
import { userRouter } from '~/server/api/routers/user';
import { visitRouter } from '~/server/api/routers/visit';
import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auditLog: auditLogRouter,
  customerCard: customerCardRouter,
  user: userRouter,
  visit: visitRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
