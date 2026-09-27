import type { PaymentStatus } from '@/types/payment.types';

export type { PaymentStatus };

export interface PaymentHistoryResponseDto {
  id: string;
  paymentId: string;
  status: PaymentStatus;
  changedAtUtc: string;
  remarks?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}
