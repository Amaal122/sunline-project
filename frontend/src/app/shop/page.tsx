import { getProducts, ProductFilters } from "@/lib/api";
import { FitType, SortOption } from "@/types/product";
import ProductGrid from "@/components/shop/ProductGrid";
import ShopFilters from "@/components/shop/ShopFilters";

interface ShopPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  const filters: ProductFilters = {
    fit: params.fit as FitType | undefined,
    color: params.color,
    size: params.size, // already a string — matches the API directly
    min_price: params.min_price ? Number(params.min_price) : undefined,
    max_price: params.max_price ? Number(params.max_price) : undefined,
    in_stock: params.in_stock === "true",
    sort: (params.sort as SortOption) || "featured",
    q: params.q,
  };

  const products = await getProducts(filters);

  return (
    <div className="wrap">
      <div className="shop-layout grid grid-cols-[240px_1fr] gap-10">
        <ShopFilters activeFilters={params} />
        <div>
          <p className="mb-6 text-sm text-ink/60">{products.length} products</p>
          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  );
}
