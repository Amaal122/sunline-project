"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { DenimArt } from "@/components/sunline-art";
import { ProductListItem, colorToHex, money } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStore } from "./storefront-shell";

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  if (!products.length) {
    return <p className="muted-empty">No products match these filters.</p>;
  }

  return (
    <div className="pgrid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const { addToCart, toggleWishlist, isWishlisted, showToast } = useStore();
  const wished = isWishlisted(product.id);

  return (
    <article className="pcard">
      <div className="thumb">
        <button
          className={cn("wish-toggle", wished && "active")}
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() => toggleWishlist(product)}
        >
          <Heart aria-hidden="true" />
        </button>
        <Link href={`/product/${product.slug}`} aria-label={product.name}>
          {product.primary_image ? (
            <img
              className="product-img"
              src={product.primary_image.url}
              alt={product.primary_image.alt_text ?? product.name}
            />
          ) : (
            <div className="art">
              <DenimArt seed={product.name.length} />
            </div>
          )}
        </Link>
        <div className="quick-add">
          <button
            className="btn btn-dark btn-sm btn-block"
            type="button"
            onClick={() => {
              if (!product.first_available_variant_id) {
                showToast("This piece is out of stock");
                return;
              }
              void addToCart(product.first_available_variant_id);
            }}
          >
            Quick Add
          </button>
        </div>
      </div>
      <Link className="info product-info-link" href={`/product/${product.slug}`}>
        <div className="name">{product.name}</div>
        <div className="meta">{product.fit}</div>
        <div className="meta">
          {product.compare_at_price ? (
            <span className="price-old">{money(product.compare_at_price)}</span>
          ) : null}
          <strong>{money(product.base_price)}</strong>
        </div>
        <div className="swatches">
          {product.available_colors.map((color) => (
            <span
              className="swatch"
              key={color}
              style={{ background: colorToHex(color) }}
              title={color}
            />
          ))}
        </div>
      </Link>
    </article>
  );
}
