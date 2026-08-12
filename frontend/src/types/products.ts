// src/types/product.ts
export type FitType = "Straight" | "Wide Leg" | "Skinny" | "Mom Jeans" | "Flare";

export interface ProductVariant {
  id: string; // UUID
  color: string;
  size: number;
  sku: string;
  stock_quantity: number;
  is_in_stock: boolean;
  price_override: string | null; // Decimal serializes as string from FastAPI
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fit: FitType;
  base_price: string;
  compare_at_price: string | null;
  care_instructions: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}