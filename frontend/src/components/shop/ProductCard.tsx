import Link from "next/link";
import Image from "next/image";
import { ProductListOut } from "@/types/product";
import { colorToHex } from "@/lib/colors";

// Same duotone-lavender/gray/ivory placeholder background rotation
// used across the static prototype, until real product photography
// is wired up via Cloudinary in Phase 7.
const PLACEHOLDER_BG = ["#e3dbe3", "#F2F0F1", "#ded6de"];

export default function ProductCard({ product }: { product: ProductListOut }) {
  const isOnSale = product.compare_at_price !== null;
  const bg = PLACEHOLDER_BG[product.id.charCodeAt(0) % PLACEHOLDER_BG.length];

  return (
    <Link href={`/product/${product.slug}`} className="pcard block">
      <div className="thumb relative aspect-[3/4] overflow-hidden" style={{ background: bg }}>
        {isOnSale && <span className="badge-tag alt">Sale</span>}
        {product.primary_image ? (
          <Image
            src={product.primary_image.url}
            alt={product.primary_image.alt_text ?? product.name}
            fill
            className="art object-cover"
            sizes="(max-width: 700px) 50vw, 25vw"
          />
        ) : null}
      </div>
      <div className="info mt-3">
        <div className="name text-sm font-medium">{product.name}</div>
        <div className="meta text-xs text-ink/60">{product.fit}</div>
        <div className="meta mt-1 flex gap-2 text-sm">
          {isOnSale && (
            <span className="price-old text-ink/40 line-through">
              {product.compare_at_price} DT
            </span>
          )}
          <strong>{product.base_price} DT</strong>
        </div>
        <div className="swatches mt-2 flex gap-1">
          {product.available_colors.map((c) => (
            <span
              key={c}
              className="swatch h-3 w-3 rounded-full border border-ink/10"
              style={{ background: colorToHex(c) }}
              title={c}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
