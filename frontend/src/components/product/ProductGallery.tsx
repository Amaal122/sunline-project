"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductImageOut } from "@/types/product";

export default function ProductGallery({
  images,
  productName,
}: {
  images: ProductImageOut[];
  productName: string;
}) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = sorted[activeIndex];

  if (sorted.length === 0) {
    return <div className="gallery-main bg-gray" style={{ aspectRatio: "3/4" }} />;
  }

  return (
    <div>
      <div className="gallery-main" style={{ position: "relative", aspectRatio: "3/4" }}>
        <Image
          src={active.url}
          alt={active.alt_text ?? productName}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
        />
      </div>
      {sorted.length > 1 && (
        <div className="gallery-thumbs" style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {sorted.map((img, i) => (
            <button
              key={img.id}
              className={`th ${i === activeIndex ? "active" : ""}`}
              style={{ position: "relative", width: 74, aspectRatio: "3/4" }}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="74px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
