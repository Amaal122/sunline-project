"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { getWishlist } from "@/lib/api";
import { ProductListOut } from "@/types/product";
import { useAppState } from "@/context/AppStateContext";
import ProductGrid from "@/components/shop/ProductGrid";

export default function WishlistGrid() {
  const { isLoggedIn } = useAppState();
  const [products, setProducts] = useState<ProductListOut[] | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setProducts([]);
      return;
    }
    getWishlist().then((w) => setProducts(w.products));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="wrap empty-state">
        <Heart aria-hidden="true" />
        <h2>Sign in to see your wishlist</h2>
        <p>Your saved pieces are tied to your account.</p>
        <Link className="btn btn-dark" href="/login?next=/wishlist">Sign In</Link>
      </div>
    );
  }

  if (products === null) {
    return <div className="wrap" style={{ padding: "60px 0", textAlign: "center" }}>Loading…</div>;
  }

  if (products.length === 0) {
    return (
      <div className="wrap empty-state">
        <Heart aria-hidden="true" />
        <h2>Your wishlist is empty</h2>
        <p>Save your favourite pieces to find them here.</p>
        <Link className="btn btn-dark" href="/shop">Explore Jeans</Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingBottom: 100 }}>
      <ProductGrid products={products} />
    </div>
  );
}
