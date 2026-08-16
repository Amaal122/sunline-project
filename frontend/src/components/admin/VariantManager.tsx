"use client";

import { useState } from "react";
import { ProductVariantOut } from "@/types/product";
import { adminCreateVariant, adminUpdateVariant, adminDeleteVariant, ApiError } from "@/lib/api";

export default function VariantManager({
  productId,
  variants,
  onChange,
}: {
  productId: string;
  variants: ProductVariantOut[];
  onChange: () => void;
}) {
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [error, setError] = useState("");

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await adminCreateVariant(productId, { color, size, sku, stock_quantity: parseInt(stock, 10) || 0 });
      setColor(""); setSize(""); setSku(""); setStock("0");
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add variant");
    }
  }

  async function updateStock(variant: ProductVariantOut, newStock: number) {
    await adminUpdateVariant(productId, variant.id, { stock_quantity: newStock });
    onChange();
  }

  async function deleteVariant(variant: ProductVariantOut) {
    if (!confirm(`Delete variant ${variant.color} / ${variant.size}?`)) return;
    try {
      await adminDeleteVariant(productId, variant.id);
      onChange();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete variant");
    }
  }

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 20 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--ink-faint)", textAlign: "left" }}>
            <th style={{ padding: 8 }}>Color</th>
            <th style={{ padding: 8 }}>Size</th>
            <th style={{ padding: 8 }}>SKU</th>
            <th style={{ padding: 8 }}>Stock</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} style={{ borderBottom: "1px solid var(--ink-faint)" }}>
              <td style={{ padding: 8 }}>{v.color}</td>
              <td style={{ padding: 8 }}>{v.size}</td>
              <td style={{ padding: 8 }}>{v.sku}</td>
              <td style={{ padding: 8 }}>
                <input
                  type="number"
                  defaultValue={v.stock_quantity}
                  style={{ width: 70, padding: 4, border: "1px solid var(--ink-faint)" }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val !== v.stock_quantity) updateStock(v, val);
                  }}
                />
              </td>
              <td style={{ padding: 8 }}>
                <button onClick={() => deleteVariant(v)} style={{ color: "#b00020", textDecoration: "underline", fontSize: 12 }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={addVariant} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>Color</label>
          <input required value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 110 }} />
        </div>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>Size</label>
          <input required value={size} onChange={(e) => setSize(e.target.value)} style={{ width: 70 }} />
        </div>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>SKU</label>
          <input required value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: 150 }} />
        </div>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>Stock</label>
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={{ width: 70 }} />
        </div>
        <button className="btn btn-outline btn-sm" type="submit">+ Add Variant</button>
      </form>
      {error && <p style={{ color: "#b00020", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
