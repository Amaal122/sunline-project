import WishlistGrid from "@/components/product/WishlistGrid";

export const metadata = { title: "Wishlist — SUNLINE" };

export default function WishlistPage() {
  return (
    <>
      <div className="wrap crumb"><a href="/">Home</a> / Wishlist</div>
      <div className="wrap page-title">
        <h1>Your Wishlist</h1>
      </div>
      <WishlistGrid />
    </>
  );
}
