"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetProduct, adminUpdateProduct, ApiError } from "@/lib/api";
import { ProductDetailOut, FitType } from "@/types/product";
import VariantManager from "@/components/admin/VariantManager";
import ImageManager from "@/components/admin/ImageManager";

const FITS: FitType[] = ["Straight", "Wide Leg", "Skinny", "Mom Jeans", "Flare"];

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetailOut | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  function load() {
    adminGetProduct(params.id)
      .then(setProduct)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load product"));
  }

  useEffect(load, [params.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    setError("");
    try {
      await adminUpdateProduct(product.id, {
        name: product.name,
        slug: product.slug,
        description: product.description,
        fit: product.fit,
        base_price: parseFloat(product.base_price),
        compare_at_price: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
        care_instructions: product.care_instructions,
        is_active: product.is_active,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (error && !product) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <button onClick={() => router.push("/admin/products")} style={{ marginBottom: 20, fontSize: 13, textDecoration: "underline" }}>
        ← Back to Products
      </button>

      <h2 style={{ marginBottom: 20 }}>{product.name}</h2>

      <form onSubmit={handleSave}>
        <div className="form-field">
          <label>Name</label>
          <input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
        </div>
        <div className="form-field">
          <label>Slug</label>
          <input value={product.slug} onChange={(e) => setProduct({ ...product, slug: e.target.value })} />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea rows={3} value={product.description ?? ""} onChange={(e) => setProduct({ ...product, description: e.target.value })} />
        </div>
        <div className="form-row2">
          <div className="form-field">
            <label>Fit</label>
            <select value={product.fit} onChange={(e) => setProduct({ ...product, fit: e.target.value as FitType })}>
              {FITS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Base Price (DT)</label>
            <input type="number" step="0.01" value={product.base_price} onChange={(e) => setProduct({ ...product, base_price: e.target.value })} />
          </div>
        </div>
        <div className="form-field">
          <label>Compare-at Price</label>
          <input
            type="number"
            step="0.01"
            value={product.compare_at_price ?? ""}
            onChange={(e) => setProduct({ ...product, compare_at_price: e.target.value || null })}
          />
        </div>
        <div className="form-field">
          <label>Care Instructions</label>
          <textarea rows={2} value={product.care_instructions ?? ""} onChange={(e) => setProduct({ ...product, care_instructions: e.target.value })} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13.5 }}>
          <input type="checkbox" checked={product.is_active} onChange={(e) => setProduct({ ...product, is_active: e.target.checked })} />
          Active (visible in the shop)
        </label>

        {error && <p style={{ color: "#b00020", fontSize: 13, marginBottom: 14 }}>{error}</p>}
        <button className="btn btn-dark" type="submit" disabled={saving}>
          {saving ? "Saving…" : savedFlash ? "Saved ✓" : "Save Changes"}
        </button>
      </form>

      <h3 className="mini-title" style={{ marginTop: 40, marginBottom: 16 }}>Variants</h3>
      <VariantManager productId={product.id} variants={product.variants} onChange={load} />

      <h3 className="mini-title" style={{ marginTop: 40, marginBottom: 16 }}>Images</h3>
      <ImageManager productId={product.id} images={product.images} onChange={load} />
    </div>
  );
}
