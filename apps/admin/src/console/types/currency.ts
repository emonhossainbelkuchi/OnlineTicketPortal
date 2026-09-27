// Mirrors CurrencyResponseDto / CurrencyCreateDto / CurrencyUpdateDto (backend).
export interface Currency {
  id: string;
  code: string;
  symbol: string;
  exchangeRateToBase: number;
  isBaseCurrency: boolean;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string; // byte[] serialized as base64
}

export interface CurrencyCreatePayload {
  code: string;
  symbol: string;
  exchangeRateToBase: number;
  isBaseCurrency: boolean;
  isActive: boolean;
}

export interface CurrencyUpdatePayload extends CurrencyCreatePayload {
  rowVersion: string;
}
