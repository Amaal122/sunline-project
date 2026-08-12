"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";

export default function Header() {
  const router = useRouter();
  const { cartCount, wishlistIds, isLoggedIn } = useAppState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  function submitSearch() {
    const q = searchTerm.trim();
    if (!q) return;
    setSearchOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      <button
        className={`overlay ${mobileOpen ? "show" : ""}`}
        type="button"
        aria-label="Close menu"
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`mobile-nav ${mobileOpen ? "open" : ""}`} aria-hidden={!mobileOpen}>
        <button className="close-x" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
          <X aria-hidden="true" />
        </button>
        {[
          ["Home", "/"],
          ["Shop", "/shop"],
          ["Collections", "/shop"],
          ["About", "/about"],
          ["Contact", "/contact"],
          [isLoggedIn ? "Account" : "Sign In", isLoggedIn ? "/account" : "/login"],
        ].map(([label, href]) => (
          <Link href={href} key={label} onClick={() => setMobileOpen(false)}>
            {label}
          </Link>
        ))}
      </aside>

      <div className="announce">FREE DELIVERY ACROSS TUNISIA FOR ORDERS OVER 200 DT</div>
      <header className="site">
        <div className="wrap nav-row">
          <button className="burger icon-btn" type="button" aria-label="Menu" onClick={() => setMobileOpen(true)}>
            <Menu aria-hidden="true" />
          </button>

          <Link className="logo" href="/">
            SUN<span>LINE</span>
          </Link>

          <nav className="main-links" aria-label="Primary">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/shop">Collections</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>

          <div className="icon-row">
            <button className="icon-btn" type="button" aria-label="Search" onClick={() => setSearchOpen((o) => !o)}>
              <Search aria-hidden="true" />
            </button>
            <Link className="icon-btn" href={isLoggedIn ? "/account" : "/login"} aria-label="Account">
              <UserRound aria-hidden="true" />
            </Link>
            <Link className="icon-btn" href="/wishlist" aria-label="Wishlist">
              <Heart aria-hidden="true" />
              {wishlistIds.length > 0 && <span className="badge">{wishlistIds.length}</span>}
            </Link>
            <Link className="icon-btn" href="/cart" aria-label="Cart">
              <ShoppingBag aria-hidden="true" />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="search-bar">
            <div className="wrap">
              <input
                value={searchTerm}
                placeholder="Search for jeans, fits, colors..."
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                autoFocus
              />
            </div>
          </div>
        )}
      </header>
    </>
  );
}