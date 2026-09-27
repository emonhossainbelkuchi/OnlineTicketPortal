import type { PaymentStatus } from '@/types/payment.types';

export type { PaymentStatus };

export interface PaymentWebhookEventResponseDto {
  id: string;
  paymentId?: string | null;
  paymentProviderId?: string | null;
  providerEventId: string;
  eventType: string;
  reportedStatus?: PaymentStatus | null;
  receivedAtUtc: string;
  isProcessed: boolean;
  processedAtUtc?: string | null;
  payloadJson?: string | null;
  errorMessage?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}
