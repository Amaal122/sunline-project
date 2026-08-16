export type FitType = "Straight" | "Wide Leg" | "Skinny" | "Mom Jeans" | "Flare";

export interface ProductImageOut {
  id: string;
  url: string;
  cloudinary_public_id: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
}

export interface ProductVariantOut {
  id: string;
  color: string;
  size: string; // API serializes size as a string, not a number
  sku: string;
  stock_quantity: number;
  price_override: string | null;
}

export interface ProductListOut {
  id: string;
  name: string;
  slug: string;
  fit: FitType;
  base_price: string;
  compare_at_price: string | null;
  is_active: boolean;
  primary_image: ProductImageOut | null;
  available_colors: string[];
  available_sizes: string[];
  first_available_variant_id: string | null;
}

export interface ProductDetailOut {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fit: FitType;
  base_price: string;
  compare_at_price: string | null;
  is_active: boolean;
  care_instructions: string | null;
  images: ProductImageOut[];
  variants: ProductVariantOut[];
}

export type SortOption = "featured" | "price-asc" | "price-desc";
