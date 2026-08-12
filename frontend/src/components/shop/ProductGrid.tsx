import { ProductListOut } from "@/types/product";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: ProductListOut[] }) {
  if (products.length === 0) {
    return (
      <p className="col-span-full py-16 text-center text-ink/60">
        No products match these filters.
      </p>
    );
  }

  return (
    <div className="pgrid grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
