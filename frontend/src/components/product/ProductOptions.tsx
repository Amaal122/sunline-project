"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductDetailOut, ProductVariantOut } from "@/types/product";
import { addCartItem, ApiError } from "@/lib/api";
import { colorToHex } from "@/lib/colors";
import { useAppState } from "@/context/AppStateContext";

export default function ProductOptions({ product }: { product: ProductDetailOut }) {
  const router = useRouter();
  const { refreshCart } = useAppState();
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantOut | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const availableSizes = product.variants.filter((v) => v.color === selectedColor);

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      await addCartItem({ product_variant_id: selectedVariant.id, quantity: 1 });
      setStatus("idle");
      await refreshCart(); // updates the header badge immediately
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Not logged in — cart requires auth on this API right now.
        // Redirect to login, preserving where they came from.
        router.push(`/login?next=/product/${product.slug}`);
        return;
      }
      setStatus("error");
      setErrorMsg("Couldn't add to cart. Please try again.");
    }
  }

  return (
    <div className="pdp-info">
      <h1>{product.name}</h1>
      <div className="price-row">
        {product.compare_at_price && (
          <span className="price-old">{product.compare_at_price} DT</span>
        )}
        <span className="price-now">{product.base_price} DT</span>
      </div>

      <div className="opt-block">
        <div className="opt-label">Color: <strong className="capitalize">{selectedColor}</strong></div>
        <div className="color-opts">
          {colors.map((c) => (
            <button
              key={c}
              className={`c ${selectedColor === c ? "selected" : ""}`}
              onClick={() => { setSelectedColor(c); setSelectedVariant(null); }}
              style={{ background: colorToHex(c) }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div className="opt-block">
        <div className="opt-label">Size</div>
        <div className="size-opts">
          {availableSizes.map((v) => (
            <button
              key={v.id}
              disabled={v.stock_quantity === 0}
              className={selectedVariant?.id === v.id ? "selected" : ""}
              onClick={() => setSelectedVariant(v)}
            >
              {v.size}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn btn-dark btn-block"
        disabled={!selectedVariant || status === "loading"}
        onClick={handleAddToCart}
      >
        {status === "loading" ? "Adding…" : "Add to Cart"}
      </button>
      {status === "error" && <p className="mt-2 text-sm text-red-700">{errorMsg}</p>}
    </div>
  );
}
