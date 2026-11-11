export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number;
  min_purchase: number | null;
  max_discount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  is_stackable: boolean; // We'll assume this column exists or handle it safely
  created_at: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  message?: string;
}
