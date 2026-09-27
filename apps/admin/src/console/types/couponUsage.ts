export interface CouponUsage {
  id: string;
  couponId: string;
  bookingId: string;
  customerProfileId?: string | null;
  discountApplied: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface CouponRedeemPayload {
  code: string;
  bookingId: string;
}