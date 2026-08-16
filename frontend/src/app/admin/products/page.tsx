"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminListProducts, adminUpdateProduct, adminDeleteProduct, ApiError } from "@/lib/api";
import { ProductDetailOut } from "@/types/product";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDetailOut[] | null>(null);
  const [error, setError] = useState("");

  function load() {
    adminListProducts()
      .then(setProducts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load products"));
  }

  useEffect(load, []);

  async function toggleActive(product: ProductDetailOut) {
    await adminUpdateProduct(product.id, { is_active: !product.is_active });
    load();
  }

  async function handleDelete(product: ProductDetailOut) {
    if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    try {
      await adminDeleteProduct(product.id);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!products) return <p>Loading…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <Link className="btn btn-dark" href="/admin/products/new">+ New Product</Link>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--ink-faint)", textAlign: "left" }}>
            <th style={{ padding: "10px 8px" }}>Name</th>
            <th style={{ padding: "10px 8px" }}>Fit</th>
            <th style={{ padding: "10px 8px" }}>Price</th>
            <th style={{ padding: "10px 8px" }}>Variants</th>
            <th style={{ padding: "10px 8px" }}>Stock</th>
            <th style={{ padding: "10px 8px" }}>Active</th>
            <th style={{ padding: "10px 8px" }}></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const variants = Array.isArray(p.variants) ? p.variants : [];
            const totalStock = variants.reduce((sum, v) => sum + (v?.stock_quantity ?? 0), 0);
            return (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--ink-faint)" }}>
                <td style={{ padding: "10px 8px" }}>{p.name}</td>
                <td style={{ padding: "10px 8px" }}>{p.fit}</td>
                <td style={{ padding: "10px 8px" }}>{p.base_price} DT</td>
                <td style={{ padding: "10px 8px" }}>{variants.length}</td>
                <td style={{ padding: "10px 8px" }}>{totalStock}</td>
                <td style={{ padding: "10px 8px" }}>
                  <button
                    onClick={() => toggleActive(p)}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 12,
                      background: p.is_active ? "var(--lavender)" : "var(--gray)",
                      border: "none",
                    }}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td style={{ padding: "10px 8px", display: "flex", gap: 10 }}>
                  <Link href={`/admin/products/${p.id}`} style={{ textDecoration: "underline" }}>Edit</Link>
                  <button onClick={() => handleDelete(p)} style={{ color: "#b00020", textDecoration: "underline" }}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {products.length === 0 && <p style={{ padding: 20, color: "var(--ink-dim)" }}>No products yet.</p>}
    </div>
  );
}
