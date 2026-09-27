import { MoneyCollectedBy, PaymentGateway, PaymentMethod, PaymentStatus } from './enums';

// Mirrors DTO/PaymentsExtraDtos.cs -> PaymentInitiateDto. POST /api/payments/initiate.
export interface PaymentInitiateRequest {
  bookingId: string;
  holdToken: string;
  method: PaymentMethod;
  paymentProviderId?: string;
}

// Mirrors DTO/PaymentsExtraDtos.cs -> PaymentGatewayResultDto.
// POST /api/payments/{id}/confirm (online flow, after the gateway redirect
// comes back) and POST /api/payments/{id}/fail use this same shape.
export interface PaymentGatewayResult {
  holdToken: string;
  gatewayTransactionId?: string;
  gatewayFeeAmount: number;
  gatewayResponseJson?: string;
}

// Mirrors DTO/PaymentsExtraDtos.cs -> CounterSaleConfirmDto.
// POST /api/payments/counter-sale/confirm — Piece 5's "mark as paid in
// cash" action, NOT the same endpoint as the online confirm above.
export interface CounterSaleConfirmRequest {
  bookingId: string;
  holdToken: string;
  method: PaymentMethod; // defaults to Cash on the backend
}

// Mirrors DTO/PaymentsExtraDtos.cs -> PaymentResponseDto.
export interface Payment {
  id: string;
  bookingId: string;
  paymentProviderId: string | null;
  method: PaymentMethod;
  gateway: PaymentGateway;
  collectedBy: MoneyCollectedBy;
  gatewayTransactionId: string | null;
  merchantInvoiceNumber: string | null;
  amount: number;
  gatewayFeeAmount: number;
  netReceivedAmount: number;
  currency: string;
  status: PaymentStatus;
  transactionDateUtc: string;
  paidAtUtc: string | null;
  failedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}
