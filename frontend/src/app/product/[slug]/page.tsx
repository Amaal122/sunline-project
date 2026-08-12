import { notFound } from "next/navigation";
import { getProductBySlug, getProducts, ApiError } from "@/lib/api";
import ProductGallery from "@/components/product/ProductGallery";
import ProductOptions from "@/components/product/ProductOptions";
import WishlistButton from "@/components/product/WishlistButton";
import ProductGrid from "@/components/shop/ProductGrid";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return {
      title: `${product.name} — SUNLINE`,
      description: product.description ?? undefined,
      openGraph: {
        images: product.images[0]?.url ? [product.images[0].url] : [],
      },
    };
  } catch {
    return { title: "Product — SUNLINE" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err; // let error.tsx handle anything unexpected (500s, network errors)
  }

  // Related products: same fit, excluding the current product
  const related = (await getProducts({ fit: product.fit }))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <>
      <div className="wrap crumb">
        <a href="/">Home</a> / <a href="/shop">Shop</a> / {product.name}
      </div>
      <div className="wrap pdp">
        <ProductGallery images={product.images} productName={product.name} />
        <div>
          <ProductOptions product={product} />
          <div style={{ marginTop: 16 }}>
            <WishlistButton productId={product.id} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="block wrap" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">You may also like</span>
              <h2>Complete the Look</h2>
            </div>
          </div>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
