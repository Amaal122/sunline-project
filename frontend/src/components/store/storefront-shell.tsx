"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";

import { DenimArt } from "@/components/sunline-art";
import {
  API_BASE_URL,
  Cart,
  ProductListItem,
  Wishlist,
  emptyCart,
  money,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type StoreContextValue = {
  cart: Cart;
  wishlistIds: string[];
  wishlistProducts: ProductListItem[];
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateCartItem: (variantId: string, quantity: number) => Promise<void>;
  removeCartItem: (variantId: string) => Promise<void>;
  toggleWishlist: (product: ProductListItem) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  showToast: (message: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const GUEST_WISHLIST_KEY = "sunline_guest_wishlist";
const GUEST_WISHLIST_PRODUCTS_KEY = "sunline_guest_wishlist_products";
const ACCESS_TOKEN_KEY = "sunline_access_token";

function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}

function readGuestWishlist() {
  try {
    return JSON.parse(window.localStorage.getItem(GUEST_WISHLIST_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function writeGuestWishlist(ids: string[]) {
  window.localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids));
}

function readGuestWishlistProducts() {
  try {
    return JSON.parse(
      window.localStorage.getItem(GUEST_WISHLIST_PRODUCTS_KEY) ?? "[]",
    ) as ProductListItem[];
  } catch {
    return [];
  }
}

function writeGuestWishlistProducts(products: ProductListItem[]) {
  window.localStorage.setItem(GUEST_WISHLIST_PRODUCTS_KEY, JSON.stringify(products));
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used inside StorefrontShell");
  }
  return context;
}

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<ProductListItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const loadCart = async () => {
    try {
      setCart(await apiRequest<Cart>("/api/cart"));
    } catch {
      setCart(emptyCart);
    }
  };

  const loadWishlist = async () => {
    const token = getAccessToken();
    if (!token) {
      setWishlistIds(readGuestWishlist());
      setWishlistProducts(readGuestWishlistProducts());
      return;
    }

    try {
      const wishlist = await apiRequest<Wishlist>("/api/wishlist");
      setWishlistIds(wishlist.product_ids);
      setWishlistProducts(wishlist.products);
    } catch {
      setWishlistIds([]);
      setWishlistProducts([]);
    }
  };

  useEffect(() => {
    void loadCart();
    void loadWishlist();
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      cart,
      wishlistIds,
      wishlistProducts,
      addToCart: async (variantId, quantity = 1) => {
        const next = await apiRequest<Cart>("/api/cart/items", {
          method: "POST",
          body: JSON.stringify({ product_variant_id: variantId, quantity }),
        });
        setCart(next);
        setDrawerOpen(true);
        showToast("Added to bag");
      },
      updateCartItem: async (variantId, quantity) => {
        setCart(
          await apiRequest<Cart>(`/api/cart/items/${variantId}`, {
            method: "PUT",
            body: JSON.stringify({ quantity }),
          }),
        );
      },
      removeCartItem: async (variantId) => {
        setCart(
          await apiRequest<Cart>(`/api/cart/items/${variantId}`, {
            method: "DELETE",
          }),
        );
        showToast("Removed from bag");
      },
      toggleWishlist: async (product) => {
        const token = getAccessToken();
        const wished = wishlistIds.includes(product.id);

        if (!token) {
          const next = wished
            ? wishlistIds.filter((id) => id !== product.id)
            : [...wishlistIds, product.id];
          const nextProducts = wished
            ? wishlistProducts.filter((item) => item.id !== product.id)
            : [...wishlistProducts.filter((item) => item.id !== product.id), product];
          setWishlistIds(next);
          setWishlistProducts(nextProducts);
          writeGuestWishlist(next);
          writeGuestWishlistProducts(nextProducts);
          showToast(wished ? "Removed from wishlist" : "Saved to wishlist");
          return;
        }

        const wishlist = await apiRequest<Wishlist>(`/api/wishlist/items/${product.id}`, {
          method: wished ? "DELETE" : "POST",
        });
        setWishlistIds(wishlist.product_ids);
        setWishlistProducts(wishlist.products);
        showToast(wished ? "Removed from wishlist" : "Saved to wishlist");
      },
      isWishlisted: (productId) => wishlistIds.includes(productId),
      showToast,
    }),
    [cart, wishlistIds, wishlistProducts],
  );

  return (
    <StoreContext.Provider value={value}>
      <div className="app-shell">
        <button
          className={cn("overlay", (drawerOpen || mobileOpen) && "show")}
          type="button"
          aria-label="Close panels"
          onClick={() => {
            setDrawerOpen(false);
            setMobileOpen(false);
          }}
        />
        <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <Toast message={toast} />

        <div className="announce">FREE DELIVERY ACROSS TUNISIA FOR ORDERS OVER 200 DT</div>
        <header className="site">
          <div className="wrap nav-row">
            <button
              className="burger icon-btn"
              type="button"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <Link className="logo" href="/">
              SUN<span>LINE</span>
            </Link>
            <nav className="main-links" aria-label="Primary">
              <Link href="/shop?in_stock=true&sort=featured">New In</Link>
              <Link href="/shop">Shop</Link>
              <Link href="/shop?fit=Wide%20Leg">Collections</Link>
              <Link href="/#about">About</Link>
              <Link href="/#contact">Contact</Link>
            </nav>
            <div className="icon-row">
              <form action="/shop" method="get" className="mini-search">
                <input name="q" aria-label="Search products" placeholder="Search" />
                <button className="icon-btn" type="submit" aria-label="Search">
                  <Search aria-hidden="true" />
                </button>
              </form>
              <Link className="icon-btn" href="/#login" aria-label="Account">
                <UserRound aria-hidden="true" />
              </Link>
              <Link className="icon-btn" href="/wishlist" aria-label="Wishlist">
                <Heart aria-hidden="true" />
                <Badge count={wishlistIds.length} />
              </Link>
              <button
                className="icon-btn"
                type="button"
                aria-label="Cart"
                onClick={() => setDrawerOpen(true)}
              >
                <ShoppingBag aria-hidden="true" />
                <Badge count={cart.count} />
              </button>
            </div>
          </div>
        </header>

        <main>{children}</main>
        <Footer />
      </div>
    </StoreContext.Provider>
  );
}

function Badge({ count }: { count: number }) {
  if (!count) {
    return null;
  }
  return <span className="badge">{count}</span>;
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside className={cn("mobile-nav", open && "open")} aria-hidden={!open}>
      <button className="close-x" type="button" aria-label="Close menu" onClick={onClose}>
        <X aria-hidden="true" />
      </button>
      {[
        ["New In", "/shop?in_stock=true"],
        ["Shop", "/shop"],
        ["Wide Leg", "/shop?fit=Wide%20Leg"],
        ["Wishlist", "/wishlist"],
      ].map(([label, href]) => (
        <Link href={href} key={label} onClick={onClose}>
          {label}
        </Link>
      ))}
    </aside>
  );
}

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, updateCartItem, removeCartItem } = useStore();

  return (
    <aside className={cn("cart-drawer", open && "open")} aria-hidden={!open}>
      <div className="drawer-head">
        <span className="serif">Your Bag</span>
        <button type="button" aria-label="Close cart" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="drawer-body">
        {cart.items.length ? (
          cart.items.map((item) => (
            <div className="cart-line compact" key={item.product_variant_id}>
              <Link className="cimg" href={`/product/${item.product.slug}`} onClick={onClose}>
                {item.product.primary_image ? (
                  <img
                    src={item.product.primary_image.url}
                    alt={item.product.primary_image.alt_text ?? item.product.name}
                  />
                ) : (
                  <DenimArt seed={item.product.name.length} />
                )}
              </Link>
              <div>
                <Link className="cname" href={`/product/${item.product.slug}`} onClick={onClose}>
                  {item.product.name}
                </Link>
                <div className="cmeta">
                  {item.variant.color} / EU {item.variant.size}
                </div>
                <div className="qty-box compact">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateCartItem(item.product_variant_id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateCartItem(item.product_variant_id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="cart-line-actions">
                <div className="cprice">{money(item.line_total)}</div>
                <button
                  className="remove-link"
                  type="button"
                  onClick={() => removeCartItem(item.product_variant_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <ShoppingBag aria-hidden="true" />
            <h2>Your bag is empty.</h2>
            <Link className="btn btn-dark" href="/shop" onClick={onClose}>
              Shop Now
            </Link>
          </div>
        )}
      </div>
      {cart.items.length ? (
        <div className="drawer-foot">
          <div className="sum-row">
            <span>Subtotal</span>
            <span>{money(cart.subtotal)}</span>
          </div>
          <div className="sum-row">
            <span>Delivery</span>
            <span>{Number(cart.delivery_fee) === 0 ? "Free" : money(cart.delivery_fee)}</span>
          </div>
          <div className="sum-row total">
            <span>Total</span>
            <span>{money(cart.total)}</span>
          </div>
          <Link className="btn btn-dark btn-block" href="/#checkout" onClick={onClose}>
            Checkout
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className={cn("toast", message && "show")} aria-live="polite">
      <span className="dot" />
      <span>{message || "Updated"}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="site footer-site">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="foot-logo">SUNLINE</div>
            <p>Premium denim designed and finished in Tunisia.</p>
            <div className="sunline" />
          </div>
          <FooterColumn title="Shop" links={[["All Jeans", "/shop"], ["Wishlist", "/wishlist"]]} />
          <FooterColumn title="Support" links={[["Shipping", "/#faq"], ["Contact Us", "/#contact"]]} />
          <FooterColumn title="Company" links={[["About SUNLINE", "/#about"], ["Sustainability", "/#about"]]} />
        </div>
        <div className="foot-bottom">
          <span>Copyright 2026 SUNLINE Tunisia. All rights reserved.</span>
          <span className="pay-icons">COD / CARTE BANCAIRE / TND</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h5>{title}</h5>
      <ul>
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
