"use client";

import { useMemo, useState } from "react";
import { Heart, Lock, RotateCcw, Truck } from "lucide-react";

import { DenimArt } from "@/components/sunline-art";
import { ProductDetail as ProductDetailType, colorToHex, money } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStore } from "./storefront-shell";

export function ProductDetail({ product }: { product: ProductDetailType }) {
  const { addToCart, toggleWishlist, isWishlisted, showToast } = useStore();
  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((variant) => variant.color))),
    [product.variants],
  );
  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((variant) => variant.size))).sort(),
    [product.variants],
  );
  const [color, setColor] = useState(colors[0] ?? "");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);

  const selectedVariant = product.variants.find(
    (variant) => variant.color === color && variant.size === size,
  );
  const activeImage = product.images[thumb] ?? product.images[0] ?? null;

  return (
    <div className="wrap pdp">
      <div>
        <div className="gallery-main">
          {activeImage ? (
            <img
              className="product-img"
              src={activeImage.url}
              alt={activeImage.alt_text ?? product.name}
            />
          ) : (
            <DenimArt seed={product.name.length} />
          )}
        </div>
        {product.images.length > 1 ? (
          <div className="gallery-thumbs">
            {product.images.map((image, index) => (
              <button
                className={cn("th", thumb === index && "active")}
                key={image.id}
                type="button"
                onClick={() => setThumb(index)}
              >
                <img src={image.url} alt={image.alt_text ?? product.name} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="pdp-info">
        <span className="eyebrow">{product.fit} - SUNLINE</span>
        <h1>{product.name}</h1>
        <div className="price-row">
          {product.compare_at_price ? (
            <span className="price-old price-old-lg">{money(product.compare_at_price)}</span>
          ) : null}
          <span className="price-now">{money(product.base_price)}</span>
        </div>
        {product.description ? <p className="lead">{product.description}</p> : null}

        <div className="opt-block">
          <div className="opt-label">
            Color: <strong>{color}</strong>
          </div>
          <div className="color-opts">
            {colors.map((item) => (
              <button
                className={cn("c", color === item && "selected")}
                key={item}
                type="button"
                title={item}
                style={{ background: colorToHex(item) }}
                onClick={() => {
                  setColor(item);
                  setSize("");
                }}
              />
            ))}
          </div>
        </div>

        <div className="opt-block">
          <div className="opt-label">Size</div>
          <div className="size-opts">
            {sizes.map((item) => {
              const variant = product.variants.find(
                (candidate) => candidate.color === color && candidate.size === item,
              );
              return (
                <button
                  className={cn(size === item && "selected")}
                  disabled={!variant || variant.stock_quantity <= 0}
                  key={item}
                  type="button"
                  onClick={() => setSize(item)}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="opt-block">
          <div className="opt-label">Quantity</div>
          <div className="qty-box">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}>
              -
            </button>
            <span>{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty(qty + 1)}>
              +
            </button>
          </div>
        </div>

        <div className="pdp-actions">
          <button
            className="btn btn-dark"
            type="button"
            onClick={() => {
              if (!selectedVariant) {
                showToast("Please choose an available size");
                return;
              }
              void addToCart(selectedVariant.id, qty);
            }}
          >
            Add to Cart
          </button>
          <button
            className={cn("wish-toggle pdp-wish", isWishlisted(product.id) && "active")}
            type="button"
            aria-label="Toggle wishlist"
            onClick={() => toggleWishlist(product)}
          >
            <Heart aria-hidden="true" />
          </button>
        </div>

        <div className="trust-mini">
          <span>
            <Truck aria-hidden="true" /> Free delivery over 200 DT
          </span>
          <span>
            <RotateCcw aria-hidden="true" /> 14-day returns
          </span>
          <span>
            <Lock aria-hidden="true" /> COD available
          </span>
        </div>

        <div className="accordion">
          <div className="accordion-item open">
            <div className="acc-head">Details</div>
            <div className="acc-body">
              <div className="acc-body-inner">
                Mid-weight stretch denim designed in Tunis and finished by partner ateliers.
              </div>
            </div>
          </div>
          <div className="accordion-item open">
            <div className="acc-head">Care</div>
            <div className="acc-body">
              <div className="acc-body-inner">
                {product.care_instructions ?? "Machine wash cold, inside out, with similar colors."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
