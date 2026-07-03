import { announcementRouter } from '~/server/api/routers/announcement';
import { auditLogRouter } from '~/server/api/routers/audit-log';
import { businessGroupRouter } from '~/server/api/routers/business-group';
import { customerCardRouter } from '~/server/api/routers/customer-card';
import { feedbackRouter } from '~/server/api/routers/feedback';
import { salesRepresentativeRouter } from '~/server/api/routers/sales-representative';
import { userRouter } from '~/server/api/routers/user';
import { visitRouter } from '~/server/api/routers/visit';
import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import { dashboardConfigRouter } from './routers/dashboard-config';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  announcement: announcementRouter,
  auditLog: auditLogRouter,
  businessGroup: businessGroupRouter,
  customerCard: customerCardRouter,
  feedback: feedbackRouter,
  user: userRouter,
  visit: visitRouter,
  salesRepresentative: salesRepresentativeRouter,
  dashboardConfig: dashboardConfigRouter,
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
