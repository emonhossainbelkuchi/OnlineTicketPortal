import { CustomerWalletTransactionType, Gender } from './enums';

// Mirrors DTO/PeopleDtos.cs -> CustomerProfileCreateDto. `userId` is only honored as-sent for
// Admin/Staff/Operator creating a profile on someone else's behalf — for a plain Customer caller
// the backend forces it to their own id regardless of what's sent, so Piece 3 always sends its
// own current user's id here and lets the server override/ignore it as appropriate.
export interface CustomerProfileCreateRequest {
  userId: string;
  nationalIdNumber?: string;
  dateOfBirth?: string; // yyyy-MM-dd (DateOnly on the backend)
  gender: Gender;
  emergencyContactPhone?: string;
  preferredLanguageCode?: string;
}

// Mirrors DTO/PeopleDtos.cs -> CustomerProfileUpdateDto. userId/walletBalance are deliberately
// absent — neither is ever editable through this endpoint (see PeopleDtos.cs header comment).
export interface CustomerProfileUpdateRequest {
  nationalIdNumber?: string;
  dateOfBirth?: string;
  gender: Gender;
  emergencyContactPhone?: string;
  preferredLanguageCode?: string;
  rowVersion: string;
}

// Mirrors DTO/PeopleDtos.cs -> CustomerProfileResponseDto.
export interface CustomerProfile {
  id: string;
  userId: string;
  nationalIdNumber: string | null;
  dateOfBirth: string | null;
  gender: Gender;
  emergencyContactPhone: string | null;
  walletBalance: number;
  preferredLanguageCode: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/PeopleDtos.cs -> CustomerAddressCreateDto. customerProfileId is deliberately
// absent — CustomerAddressesController always resolves/creates it from whoever is logged in.
export interface CustomerAddressCreateRequest {
  label: string;
  addressLine: string;
  city: string;
  district: string;
  country: string;
  isDefault: boolean;
}

export interface CustomerAddressUpdateRequest {
  label: string;
  addressLine: string;
  city: string;
  district: string;
  country: string;
  isDefault: boolean;
  rowVersion: string;
}

// Mirrors DTO/PeopleDtos.cs -> CustomerAddressResponseDto.
export interface CustomerAddress {
  id: string;
  customerProfileId: string;
  label: string;
  addressLine: string;
  city: string;
  district: string;
  country: string;
  isDefault: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/PeopleDtos.cs -> CustomerWalletTransactionResponseDto. Read-only — the wallet
// balance and its transaction trail are only ever written together by CustomerWalletService.
export interface CustomerWalletTransaction {
  id: string;
  customerProfileId: string;
  bookingId: string | null;
  refundId: string | null;
  transactionType: CustomerWalletTransactionType;
  amount: number;
  balanceAfter: number;
  currency: string;
  description: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}
