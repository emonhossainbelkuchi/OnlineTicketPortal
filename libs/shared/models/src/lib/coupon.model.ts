import { CouponType } from './enums';

// Mirrors DTO/MarketingDtos.cs -> CouponResponseDto. Admin-authored discount rules — Piece 3
// never creates/edits these, only reads a code's rules for display and redeems it at checkout.
export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  discountAmount: number | null;
  discountPercentage: number | null;
  maxDiscountAmount: number | null;
  minBookingAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  validFromUtc: string;
  validToUtc: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/MarketingDtos.cs -> CouponRedeemDto. POST /api/couponusages/redeem. Only valid
// while the target booking is still Draft/PendingPayment (see CouponRedemptionService) — apply
// this on the payment step, before payments/initiate, never after.
export interface CouponRedeemRequest {
  code: string;
  bookingId: string;
}

// Mirrors DTO/MarketingDtos.cs -> CouponUsageResponseDto. The server works out discountApplied
// itself from the coupon's own rules — never trust/echo a client-side estimate as the real
// figure, always re-GET the booking after redeeming to read its authoritative new totals.
export interface CouponUsage {
  id: string;
  couponId: string;
  bookingId: string;
  customerProfileId: string | null;
  discountApplied: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}
