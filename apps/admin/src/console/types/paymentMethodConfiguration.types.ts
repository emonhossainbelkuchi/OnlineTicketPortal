// src/types/paymentMethodConfiguration.types.ts
//
// Mirrors TicketPortal.Api.DTO's PaymentMethodConfigurationCreateDto /
// UpdateDto / ResponseDto exactly (see PaymentMethodConfigurationsController).
// Admin-only end to end — the controller returns an empty array / Forbid for
// anyone who isn't in the "Admin" role, so every screen built on this type
// must handle a 403/empty-list response gracefully rather than assuming data.

export enum PaymentMethod {
  Cash = 1,
  Card = 2,
  MobileBanking = 3,
  BankTransfer = 4,
  OnlineGateway = 5,
  Wallet = 6,
}

export const PaymentMethodLabel: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Cash',
  [PaymentMethod.Card]: 'Card',
  [PaymentMethod.MobileBanking]: 'Mobile Banking',
  [PaymentMethod.BankTransfer]: 'Bank Transfer',
  [PaymentMethod.OnlineGateway]: 'Online Gateway',
  [PaymentMethod.Wallet]: 'Wallet',
};

export const PaymentMethodIcon: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'fa-solid fa-money-bill-wave',
  [PaymentMethod.Card]: 'fa-solid fa-credit-card',
  [PaymentMethod.MobileBanking]: 'fa-solid fa-mobile-screen-button',
  [PaymentMethod.BankTransfer]: 'fa-solid fa-building-columns',
  [PaymentMethod.OnlineGateway]: 'fa-solid fa-globe',
  [PaymentMethod.Wallet]: 'fa-solid fa-wallet',
};

// Needed only to render a readable label next to the PaymentProviderId
// dropdown/badge — mirrors PaymentProviderKind / PaymentGateway from
// Models/Enums.
export enum PaymentProviderKind {
  Gateway = 1,
  MobileBanking = 2,
  CardNetwork = 3,
  Bank = 4,
  Cash = 5,
  Wallet = 6,
}

export enum PaymentGateway {
  None = 1,
  SslCommerz = 2,
  Bkash = 3,
  Nagad = 4,
  Rocket = 5,
  Stripe = 6,
  PayPal = 7,
  Visa = 8,
  MasterCard = 9,
  Manual = 10,
}

// Thin slice of PaymentProviderResponseDto — only what the dropdown/label
// needs. Full shape lives wherever PaymentProviders has its own types file.
export interface PaymentProviderSummary {
  id: string;
  name: string;
  code: string;
  providerKind: PaymentProviderKind;
  gateway: PaymentGateway;
  isActive: boolean;
}

export interface PaymentMethodConfigurationCreateDto {
  paymentProviderId: string;
  method: PaymentMethod;
  displayName: string;
  fixedFee: number | null;
  percentageFee: number | null;
  isActive: boolean;
}

export interface PaymentMethodConfigurationUpdateDto extends PaymentMethodConfigurationCreateDto {
  rowVersion: string; // base64 byte[], echoed back from the GET response
}

export interface PaymentMethodConfigurationResponseDto {
  id: string;
  paymentProviderId: string;
  method: PaymentMethod;
  displayName: string;
  fixedFee: number | null;
  percentageFee: number | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Client-side view params for the List page — the controller itself takes no
// query params (GetAll just returns everything the caller is allowed to see),
// so search/filter/sort/paging/group-by all happen in the hook.
export interface PaymentMethodConfigurationListParams {
  search?: string;
  method?: PaymentMethod | 'all';
  status?: 'all' | 'active' | 'inactive';
  groupByMethod?: boolean;
  sortBy?: 'displayName' | 'method' | 'fixedFee' | 'percentageFee' | 'createdAtUtc';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
