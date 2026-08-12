import { ProductImageOut, ProductListOut } from "./product";

export interface CartProductOut {
  id: string;
  name: string;
  slug: string;
  base_price: string;
  compare_at_price: string | null;
  primary_image: ProductImageOut | null;
}

export interface CartVariantOut {
  id: string;
  color: string;
  size: string;
  sku: string;
  stock_quantity: number;
  price_override: string | null;
}

export interface CartLineOut {
  product_variant_id: string;
  product: CartProductOut;
  variant: CartVariantOut;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface CartOut {
  items: CartLineOut[];
  subtotal: string;
  delivery_fee: string;
  total: string;
  count: number;
}

export interface CartItemIn {
  product_variant_id: string;
  quantity?: number; // defaults to 1 on the backend
}

export interface CartItemQuantityIn {
  quantity: number; // 0 removes the line, per the API's min constraint
}

export interface WishlistOut {
  product_ids: string[];
  products: ProductListOut[];
}
