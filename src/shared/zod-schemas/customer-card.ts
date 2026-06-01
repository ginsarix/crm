import { z } from 'zod';
import { AuthorizationDocumentValidation } from './authorization-document';
import { DistrictValidation } from './district';
import { StatusValidation } from './status';
import { VoteValidation } from './vote';

export const CustomerCardCreateSchema = z.object({
  sira: z.string().optional(),
  name: z.string().min(1, 'Müşteri adı zorunludur'),
  sicil: z.string().optional(),
  address: z.string().optional(),
  district: DistrictValidation.optional(),
  region: z.string().optional(),
  gsm1: z.string().optional(),
  contact1: z.string().optional(),
  gsm2: z.string().optional(),
  contact2: z.string().optional(),
  gsm3: z.string().optional(),
  contact3: z.string().optional(),
  businessGroup: z.string().optional(),
  color: z.enum(['green', 'blue', 'orange', 'yellow', 'gray']).default('gray'),
  status: StatusValidation.nullable().optional(),
  authorizationDocument: AuthorizationDocumentValidation.nullable().optional(),
  vote: VoteValidation.nullable().optional(),
  authorities: z.string().optional(),
  salesRepresentative: z.string().optional(),
});

export const CustomerCardFindManySelectSchema = z.object({
  id: z.boolean().default(false),
  sira: z.boolean().default(true),
  name: z.boolean().default(true),
  sicil: z.boolean().default(true),
  address: z.boolean().default(true),
  district: z.boolean().default(true),
  region: z.boolean().default(true),
  gsm1: z.boolean().default(true),
  contact1: z.boolean().default(true),
  gsm2: z.boolean().default(true),
  contact2: z.boolean().default(true),
  gsm3: z.boolean().default(true),
  contact3: z.boolean().default(true),
  businessGroup: z.boolean().default(true),
  positive: z.boolean().default(true),
  status: z.boolean().default(true),
  authorizationDocument: z.boolean().default(true),
  vote: z.boolean().default(true),
  authorities: z.boolean().default(true),
  salesRepresentative: z.boolean().default(true),
  createdById: z.boolean().default(true),
  createdAt: z.boolean().default(true),
  updatedAt: z.boolean().default(true),
});
