export type PaymentMethod = 'Cash' | 'Card' | 'MobileBanking' | 'BankTransfer' | 'OnlineGateway' | 'Wallet';
export type PaymentGateway = 'None' | 'SslCommerz' | 'Bkash' | 'Nagad' | 'Rocket' | 'Stripe' | 'PayPal' | 'Visa' | 'MasterCard' | 'Manual';
export type MoneyCollectedBy = 'Platform' | 'Operator' | 'Agent' | 'Unknown';
export type PaymentStatus = 'Initiated' | 'Pending' | 'Succeeded' | 'Failed' | 'Cancelled' | 'PartiallyRefunded' | 'Refunded' | 'ReconciliationNeeded';

export interface PaymentInitiateDto {
  bookingId: string;
  holdToken: string;
  method: PaymentMethod;
  paymentProviderId?: string | null;
}

export interface PaymentGatewayResultDto {
  holdToken: string;
  gatewayTransactionId?: string | null;
  gatewayFeeAmount: number;
  gatewayResponseJson?: string | null;
}

export interface PaymentFailDto {
  holdToken: string;
  reason?: string | null;
}

export interface CounterSaleConfirmDto {
  bookingId: string;
  holdToken: string;
  method: PaymentMethod;
}

export interface PaymentResponseDto {
  id: string;
  bookingId: string;
  paymentProviderId?: string | null;
  method: PaymentMethod;
  gateway: PaymentGateway;
  collectedBy: MoneyCollectedBy;
  gatewayTransactionId?: string | null;
  merchantInvoiceNumber?: string | null;
  amount: number;
  gatewayFeeAmount: number;
  netReceivedAmount: number;
  currency: string;
  status: PaymentStatus;
  transactionDateUtc: string;
  paidAtUtc?: string | null;
  failedAtUtc?: string | null;
  gatewayResponseJson?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}
