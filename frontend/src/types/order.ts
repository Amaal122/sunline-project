// TypeScript mirrors of the backend's order schemas (app/schemas/order.py).
// Keep these in sync with any backend schema changes.

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "COD" | "online";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

/** What the checkout form POSTs to /api/orders */
export interface CheckoutIn {
  full_name: string;
  email?: string; // optional for logged-in users, required for guests
  phone: string;
  address_line: string;
  city: string;
  governorate: string;
  postal_code: string;
  payment_method: PaymentMethod;
}

/** A single line item inside an order */
export interface OrderItemOut {
  id: string;
  product_variant_id: string;
  product_name: string;
  color: string;
  size: string;
  unit_price: string; // Decimal serialised as string by FastAPI
  quantity: number;
  line_total: string; // computed_field on the backend
}

/** Full order shape — used on the confirmation page */
export interface OrderOut {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;

  subtotal: string;
  delivery_fee: string;
  total: string;

  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  governorate: string;
  postal_code: string;

  items: OrderItemOut[];
}

/** Slimmer shape for the order-history list (no line items) */
export interface OrderListItemOut {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: string;
  item_count: number;
}
