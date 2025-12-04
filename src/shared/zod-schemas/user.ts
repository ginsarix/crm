import { z } from 'zod';

export const UserCreateSchema = z.object({
  name: z.string().min(1, 'Kullanıcı adı zorunludur'),
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(1, 'Kullanıcı adı zorunludur'),
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .optional()
    .or(z.literal('')),
});

export const UserFindManySelectSchema = z.object({
  id: z.boolean().default(true),
  name: z.boolean().default(true),
  email: z.boolean().default(true),
  emailVerified: z.boolean().default(true),
  image: z.boolean().default(true),
  createdAt: z.boolean().default(true),
  updatedAt: z.boolean().default(true),
});
