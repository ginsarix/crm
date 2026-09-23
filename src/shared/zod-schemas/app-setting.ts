import { z } from 'zod';

export const CustomerCardBulkModeValidation = z.enum(['color_delete', 'vote']);

export type CustomerCardBulkMode = z.infer<
  typeof CustomerCardBulkModeValidation
>;

export const DEFAULT_CUSTOMER_CARD_BULK_MODE: CustomerCardBulkMode =
  'color_delete';

export const AppSettingUpdateSchema = z.object({
  customerCardBulkMode: CustomerCardBulkModeValidation,
});
