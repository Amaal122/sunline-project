"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductImageOut } from "@/types/product";
import { adminUploadProductImage, adminDeleteProductImage, ApiError } from "@/lib/api";

export default function ImageManager({
  productId,
  images,
  onChange,
}: {
  productId: string;
  images: ProductImageOut[];
  onChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await adminUploadProductImage(productId, file, { isPrimary: images.length === 0 });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm("Delete this image?")) return;
    try {
      await adminDeleteProductImage(productId, imageId);
      onChange();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {images.map((img) => (
          <div key={img.id} style={{ position: "relative", width: 100 }}>
            <div style={{ position: "relative", width: 100, aspectRatio: "3/4", background: "var(--gray)" }}>
              <Image src={img.url} alt={img.alt_text ?? ""} fill className="object-cover" sizes="100px" />
            </div>
            {img.is_primary && (
              <span style={{ fontSize: 10, background: "var(--lavender)", padding: "2px 6px", display: "inline-block", marginTop: 4 }}>
                Primary
              </span>
            )}
            <button
              onClick={() => handleDelete(img.id)}
              style={{ display: "block", fontSize: 11, color: "#b00020", textDecoration: "underline", marginTop: 4 }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
      {uploading && <p style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>Uploading…</p>}
      {error && <p style={{ color: "#b00020", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
