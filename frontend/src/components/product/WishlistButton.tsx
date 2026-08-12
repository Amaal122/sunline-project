"use client";

import { useRouter, usePathname } from "next/navigation";
import { addWishlistItem, removeWishlistItem, ApiError } from "@/lib/api";
import { useAppState } from "@/context/AppStateContext";

export default function WishlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { wishlistIds, isLoggedIn, refreshWishlist } = useAppState();
  const isWished = wishlistIds.includes(productId);

  async function toggle() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    try {
      if (isWished) {
        await removeWishlistItem(productId);
      } else {
        await addWishlistItem(productId);
      }
      await refreshWishlist(); // updates the header badge + this button immediately
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }
  }

  return (
    <button
      className={`wish-toggle ${isWished ? "active" : ""}`}
      style={{ position: "static", width: 52, height: 52, border: "1px solid var(--ink-faint)" }}
      onClick={toggle}
      aria-pressed={isWished}
    >
      <svg viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" fill={isWished ? "currentColor" : "none"}>
        <path d="M12 21s-7.5-4.6-10-9.3C.4 8.2 2 4 6 4c2 0 3.6 1.2 6 4 2.4-2.8 4-4 6-4 4 0 5.6 4.2 4 7.7C19.5 16.4 12 21 12 21z" />
      </svg>
      {isWished ? "Saved to Wishlist" : "Add to Wishlist"}
    </button>
  );
}
