import type { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import { auth } from '~/server/better-auth';
import {
  UserChangePasswordSchema,
  UserCreateSchema,
  UserFindManySelectSchema,
  UserSelfUpdateSchema,
  UserUpdateSchema,
} from '~/shared/zod-schemas/user';
import { findTurkishSearchMatchesInTable } from '../lib/turkish-search';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  searchScope: z.enum(['all', ...Object.keys(columnMap.user)]).default('all'),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

// Searchable text fields for "all" scope
const searchableFields = ['name', 'email'] as const;

type SearchableField = (typeof searchableFields)[number];

// Sortable fields
const sortableFields = [
  'name',
  'email',
  'emailVerified',
  'createdAt',
  'updatedAt',
] as const;

type SortableField = (typeof sortableFields)[number];

export const userRouter = createTRPCRouter({
  getTotal: adminProcedure.query(async ({ ctx }) => {
    return await ctx.db.user.count();
  }),
  get: adminProcedure
    .input(
      z.object({
        select: UserFindManySelectSchema.optional(),
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).max(500).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build search conditions based on searchScope
      const whereClause: Prisma.UserWhereInput = {};

      if (input.filter?.search) {
        const searchValue = input.filter.search;
        const scope = input.filter.searchScope;
        const fields =
          scope === 'all'
            ? searchableFields
            : searchableFields.includes(scope as SearchableField)
              ? [scope as SearchableField]
              : [];

        if (fields.length > 0) {
          whereClause.id = {
            in: await findTurkishSearchMatchesInTable(
              ctx.db,
              'user',
              fields,
              searchValue,
            ),
          };
        }
      }

      // Build orderBy clause
      const orderBy: Prisma.UserOrderByWithRelationInput[] = [];

      if (input.sorting && input.sorting.length > 0) {
        for (const sort of input.sorting) {
          if (sortableFields.includes(sort.id as SortableField)) {
            orderBy.push({
              [sort.id]: sort.desc ? 'desc' : 'asc',
            });
          }
        }
      }

      // Default sort if no sorting provided
      if (orderBy.length === 0) {
        orderBy.push({ createdAt: 'desc' });
      }

      const totalItems = await ctx.db.user.count({
        where: whereClause,
      });
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      const data = await ctx.db.user.findMany({
        select: input.select,
        where: whereClause,
        skip: (input.page - 1) * input.itemsPerPage,
        take: input.itemsPerPage,
        orderBy,
      });

      return {
        data,
        pagination: {
          totalItems,
          totalPages,
        },
      };
    }),
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              createdCustomerCards: true,
              createdVisits: true,
            },
          },
        },
      });
    }),
  getMyAccount: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        assignedBusinessGroups: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { createdCustomerCards: true, createdVisits: true },
        },
      },
    });
  }),
  updateMyProfile: protectedProcedure
    .input(UserSelfUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Goes through better-auth (not a raw db.user.update) so it also
        // refreshes the session cookie cache with the new name.
        await auth.api.updateUser({
          body: { name: input.name },
          headers: ctx.headers,
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_UPDATED',
          'USER',
          ctx.session.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı kendi profilini güncelledi: ${input.name}`,
        );

        return { success: true };
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_UPDATED',
          'USER',
          ctx.session.user.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Kullanıcı kendi profilini güncelleyemedi`,
        );
        throw error;
      }
    }),
  changeMyPassword: protectedProcedure
    .input(UserChangePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await auth.api.changePassword({
          body: {
            currentPassword: input.currentPassword,
            newPassword: input.newPassword,
          },
          headers: ctx.headers,
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'PASSWORD_CHANGED',
          'USER',
          ctx.session.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı kendi şifresini değiştirdi`,
        );

        return { success: true };
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'PASSWORD_CHANGED',
          'USER',
          ctx.session.user.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Kullanıcı kendi şifresini değiştiremedi`,
        );
        throw error;
      }
    }),
  listMySessions: protectedProcedure.query(async ({ ctx }) => {
    return await auth.api.listSessions({ headers: ctx.headers });
  }),
  getMyCustomerCards: protectedProcedure
    .input(z.object({ page: z.number().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const itemsPerPage = 10;
      const whereClause = { createdById: ctx.session.user.id };

      const [totalItems, data] = await Promise.all([
        ctx.db.customerCard.count({ where: whereClause }),
        ctx.db.customerCard.findMany({
          where: whereClause,
          select: { id: true, name: true },
          skip: (input.page - 1) * itemsPerPage,
          take: itemsPerPage,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        data,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / itemsPerPage),
        },
      };
    }),
  getMyVisits: protectedProcedure
    .input(z.object({ page: z.number().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const itemsPerPage = 10;
      const whereClause = { createdById: ctx.session.user.id };

      const [totalItems, data] = await Promise.all([
        ctx.db.visit.count({ where: whereClause }),
        ctx.db.visit.findMany({
          where: whereClause,
          select: {
            id: true,
            date: true,
            customerCard: { select: { name: true } },
          },
          skip: (input.page - 1) * itemsPerPage,
          take: itemsPerPage,
          orderBy: { date: 'desc' },
        }),
      ]);

      return {
        data,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / itemsPerPage),
        },
      };
    }),
  create: adminProcedure
    .input(UserCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await auth.api.createUser({
          body: {
            name: input.name,
            email: input.email,
            password: input.password,
            role: input.role,
          },
        });

        if (!result.user) {
          throw new Error('Kullanıcı oluşturulamadı');
        }

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_CREATED',
          'USER',
          result.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı oluşturuldu: ${input.name} (${input.email})`,
        );

        return result.user;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_CREATED',
          'USER',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Kullanıcı oluşturulamadı: ${input.name} (${input.email})`,
        );
        throw error;
      }
    }),
  update: adminProcedure
    .input(UserUpdateSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, password, ...data } = input;

      try {
        // Update user basic info (role included if provided)
        const updatedUser = await ctx.db.user.update({
          where: { id },
          data,
        });

        // If password is provided, use better-auth's admin API to set it
        if (password) {
          await auth.api
            .setUserPassword({
              body: {
                userId: id,
                newPassword: password,
              },
              headers: ctx.headers,
            })
            .catch((error) => {
              console.error(error);
              throw new Error('Şifre güncellenirken bir hata oluştu');
            });

          await createAuditLog(
            ctx.db,
            ctx.session.user.id,
            'PASSWORD_CHANGED',
            'USER',
            id,
            'SUCCESS',
            undefined,
            `Kullanıcı şifresi değiştirildi: ${updatedUser.name}`,
          );
        }

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_UPDATED',
          'USER',
          id,
          'SUCCESS',
          undefined,
          `Kullanıcı güncellendi: ${updatedUser.name} (${updatedUser.email})`,
        );

        return updatedUser;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_UPDATED',
          'USER',
          id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Kullanıcı güncellenemedi`,
        );
        throw error;
      }
    }),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if trying to delete self
      if (ctx.session.user.id === input.id) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_DELETED',
          'USER',
          input.id,
          'FAILURE',
          'Kullanıcı kendini silmeye çalıştı',
          `Kullanıcı kendini silmeye çalıştı`,
        );
        throw new Error('Kendinizi silemezsiniz');
      }

      try {
        // Get user info before deletion for audit log
        const user = await ctx.db.user.findUnique({
          where: { id: input.id },
          select: { name: true, email: true },
        });

        const result = await ctx.db.user.delete({
          where: { id: input.id },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_DELETED',
          'USER',
          input.id,
          'SUCCESS',
          undefined,
          `Kullanıcı silindi: ${user?.name} (${user?.email})`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_DELETED',
          'USER',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Kullanıcı silinemedi`,
        );
        throw error;
      }
    }),

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const idsToDelete = input.ids.filter((id) => id !== ctx.session.user.id);
      const skipped = input.ids.length - idsToDelete.length;

      if (idsToDelete.length === 0) {
        throw new Error('Kendinizi silemezsiniz');
      }

      try {
        const result = await ctx.db.user.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_DELETED',
          'USER',
          idsToDelete.join(','),
          'SUCCESS',
          undefined,
          `${result.count} kullanıcı silindi (toplu)${skipped > 0 ? ', kendi hesabınız atlandı' : ''}`,
        );
        return { ...result, skipped };
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'USER_DELETED',
          'USER',
          idsToDelete.join(','),
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Toplu kullanıcı silinemedi`,
        );
        throw error;
      }
    }),
});
