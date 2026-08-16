import { FitType } from "./product";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface ProductCreateIn {
  name: string;
  slug: string;
  description?: string | null;
  fit: FitType;
  base_price: number;
  compare_at_price?: number | null;
  care_instructions?: string | null;
  is_active?: boolean;
}

export interface ProductUpdateIn {
  name?: string;
  slug?: string;
  description?: string | null;
  fit?: FitType;
  base_price?: number;
  compare_at_price?: number | null;
  care_instructions?: string | null;
  is_active?: boolean;
}

export interface ProductVariantCreateIn {
  color: string;
  size: string;
  sku: string;
  stock_quantity?: number;
  price_override?: number | null;
}

export interface ProductVariantUpdateIn {
  color?: string;
  size?: string;
  sku?: string;
  stock_quantity?: number;
  price_override?: number | null;
}

export interface AdminOrderListItemOut {
  id: string;
  order_number: string;
  full_name: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: string;
  item_count: number;
  created_at: string;
}

export interface OrderStatusUpdateIn {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
}
