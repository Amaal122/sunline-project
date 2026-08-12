"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { ProductGrid } from "./product-card";
import { useStore } from "./storefront-shell";

export function WishlistContent() {
  const { wishlistIds, wishlistProducts } = useStore();

  return (
    <>
      <div className="wrap page-title wishlist-title">
        <h1>Your Wishlist</h1>
        <p>{wishlistIds.length} saved item(s)</p>
      </div>
      <div className="wrap wishlist-body">
        {wishlistProducts.length ? (
          <ProductGrid products={wishlistProducts} />
        ) : (
          <div className="empty-state">
            <Heart aria-hidden="true" />
            <h2>Your wishlist is empty</h2>
            <p>Save your favourite pieces to find them here.</p>
            <Link className="btn btn-dark" href="/shop">
              Explore Jeans
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
