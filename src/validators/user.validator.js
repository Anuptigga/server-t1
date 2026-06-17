import { z } from 'zod';

export const updateBankDetailsSchema = z.object({
  accountHolderName: z.string().min(3, 'Account holder name must be at least 3 characters'),
  accountNumber: z.string().min(5, 'Account number is invalid'),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC Code format'),
  bankName: z.string().min(2, 'Bank name is required'),
});
