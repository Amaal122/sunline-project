"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateProduct, adminCreateVariant, adminUploadProductImage, ApiError } from "@/lib/api";
import { FitType } from "@/types/product";

const FITS: FitType[] = ["Straight", "Wide Leg", "Skinny", "Mom Jeans", "Flare"];

export default function NewProductPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");

  // Product fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [fit, setFit] = useState<FitType>("Straight");
  const [basePrice, setBasePrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");

  // First variant fields — a product needs at least one to be sellable
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [sku, setSku] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");

  // Optional first image
  const [imageFile, setImageFile] = useState<File | null>(null);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      const product = await adminCreateProduct({
        name,
        slug: slug || slugify(name),
        description: description || null,
        fit,
        base_price: parseFloat(basePrice),
        compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
        is_active: true,
      });

      if (color && size && sku) {
        await adminCreateVariant(product.id, {
          color,
          size,
          sku,
          stock_quantity: parseInt(stockQuantity, 10) || 0,
        });
      }

      if (imageFile) {
        await adminUploadProductImage(product.id, imageFile, { isPrimary: true });
      }

      router.push(`/admin/products/${product.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ marginBottom: 20 }}>New Product</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Étoile High-Rise Straight" />
        </div>
        <div className="form-field">
          <label>Slug (leave blank to auto-generate)</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="etoile-high-rise-straight" />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-row2">
          <div className="form-field">
            <label>Fit</label>
            <select value={fit} onChange={(e) => setFit(e.target.value as FitType)}>
              {FITS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Base Price (DT)</label>
            <input required type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </div>
        </div>
        <div className="form-field">
          <label>Compare-at Price (optional, for sale badge)</label>
          <input type="number" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
        </div>

        <h3 className="mini-title" style={{ marginTop: 30 }}>First Variant</h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 14 }}>
          Optional here — you can add more colors/sizes after creating the product.
        </p>
        <div className="form-row2">
          <div className="form-field">
            <label>Color</label>
            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="indigo" />
          </div>
          <div className="form-field">
            <label>Size</label>
            <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="38" />
          </div>
        </div>
        <div className="form-row2">
          <div className="form-field">
            <label>SKU</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SUN-ETO-IND-38" />
          </div>
          <div className="form-field">
            <label>Stock Quantity</label>
            <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
          </div>
        </div>

        <h3 className="mini-title" style={{ marginTop: 30 }}>First Image (optional)</h3>
        <div className="form-field">
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
        </div>

        {error && <p style={{ color: "#b00020", fontSize: 13, marginBottom: 14 }}>{error}</p>}
        <button className="btn btn-dark btn-block" type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Creating…" : "Create Product"}
        </button>
      </form>
    </div>
  );
}
