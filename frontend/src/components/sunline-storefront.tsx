"use client";

import {
  Check,
  Clock,
  Heart,
  Lock,
  Mail,
  MapPin,
  Menu,
  Minus,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";

import { DenimArt, FitArt, HeroArt } from "@/components/sunline-art";
import {
  COLOR_SWATCHES,
  FITS,
  Fit,
  PRODUCTS,
  Product,
  ProductColor,
  money,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

type CartItem = {
  id: number;
  size: number;
  color: ProductColor;
  qty: number;
};

type LastOrder = {
  id: string;
  items: CartItem[];
  subtotal: number;
  date: string;
};

type RouteState = {
  path: string;
  params: URLSearchParams;
};

type ShopFilters = {
  fit: Fit[];
  size: string[];
  color: ProductColor[];
  sort: "featured" | "price-asc" | "price-desc" | "rating";
  maxPrice: number;
  q: string;
  badgeNew: boolean;
  inStock: boolean;
};

const GOVERNORATES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Sousse",
  "Sfax",
  "Monastir",
  "Bizerte",
  "Gabes",
];

const EMPTY_FILTERS: ShopFilters = {
  fit: [],
  size: [],
  color: [],
  sort: "featured",
  maxPrice: 250,
  q: "",
  badgeNew: false,
  inStock: false,
};

function parseHash(): RouteState {
  if (typeof window === "undefined") {
    return { path: "/", params: new URLSearchParams() };
  }

  const hash = window.location.hash.replace("#", "") || "/";
  const [path, query = ""] = hash.split("?");
  return { path: path || "/", params: new URLSearchParams(query) };
}

function navigateTo(hash: string) {
  window.location.hash = hash;
}

function getProduct(id: number) {
  return PRODUCTS.find((product) => product.id === id) ?? PRODUCTS[0];
}

function isFit(value: string): value is Fit {
  return FITS.includes(value as Fit);
}

function isProductColor(value: string): value is ProductColor {
  return value in COLOR_SWATCHES;
}

export function SunlineStorefront() {
  const [route, setRoute] = useState<RouteState>({ path: "/", params: new URLSearchParams() });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [shopFilters, setShopFilters] = useState<ShopFilters>(EMPTY_FILTERS);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const syncRoute = () => {
      setRoute(parseHash());
      setMobileOpen(false);
      setDrawerOpen(false);
      window.scrollTo({ top: 0 });
    };

    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    if (route.path !== "/shop") {
      return;
    }

    const fit = route.params.get("fit");
    const q = route.params.get("q") ?? "";
    const f = route.params.get("f");

    setShopFilters((current) => ({
      ...current,
      fit: fit && isFit(fit) ? [fit] : current.fit,
      q,
      badgeNew: f === "new",
    }));
  }, [route]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + getProduct(item.id).price * item.qty, 0);
  const delivery = subtotal >= 200 || subtotal === 0 ? 0 : 8;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  const addToCart = (
    product: Product,
    size = product.sizes[1] ?? product.sizes[0],
    color = product.colors[0],
    qty = 1,
  ) => {
    setCart((current) => {
      const index = current.findIndex(
        (item) => item.id === product.id && item.size === size && item.color === color,
      );

      if (index === -1) {
        return [...current, { id: product.id, size, color, qty }];
      }

      return current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, qty: item.qty + qty } : item,
      );
    });
    showToast(`Added to bag - ${product.name}`);
  };

  const changeQty = (index: number, delta: number) => {
    setCart((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, qty: Math.max(1, item.qty + delta) } : item,
      ),
    );
  };

  const removeFromCart = (index: number) => {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
    showToast("Removed from bag");
  };

  const toggleWishlist = (productId: number) => {
    setWishlist((current) => {
      if (current.includes(productId)) {
        showToast("Removed from wishlist");
        return current.filter((id) => id !== productId);
      }

      showToast("Saved to wishlist");
      return [...current, productId];
    });
  };

  const submitSearch = () => {
    const q = searchTerm.trim();
    if (!q) {
      return;
    }

    setSearchOpen(false);
    navigateTo(`#/shop?q=${encodeURIComponent(q)}`);
  };

  const clearFilters = () => {
    setShopFilters(EMPTY_FILTERS);
    navigateTo("#/shop");
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length) {
      showToast("Your bag is empty");
      return;
    }

    setLastOrder({
      id: `SL${Math.floor(100000 + Math.random() * 900000)}`,
      items: cart,
      subtotal,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    });
    setCart([]);
    navigateTo("#/confirmation");
  };

  const closeChrome = () => {
    setMobileOpen(false);
    setDrawerOpen(false);
  };

  return (
    <div className="app-shell">
      <button
        className={cn("overlay", (mobileOpen || drawerOpen) && "show")}
        type="button"
        aria-label="Close panels"
        onClick={closeChrome}
      />

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <CartDrawer
        open={drawerOpen}
        cart={cart}
        subtotal={subtotal}
        delivery={delivery}
        onClose={() => setDrawerOpen(false)}
        onQty={changeQty}
        onRemove={removeFromCart}
      />

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

          <a className="logo" href="#/">
            SUN<span>LINE</span>
          </a>

          <nav className="main-links" aria-label="Primary">
            <a className={cn(route.params.get("f") === "new" && "active")} href="#/shop?f=new">
              New In
            </a>
            <a className={cn(route.path === "/shop" && !route.params.get("f") && "active")} href="#/shop">
              Shop
            </a>
            <a href="#/shop">Collections</a>
            <a className={cn(route.path === "/about" && "active")} href="#/about">
              About
            </a>
            <a className={cn(route.path === "/contact" && "active")} href="#/contact">
              Contact
            </a>
          </nav>

          <div className="icon-row">
            <button
              className="icon-btn"
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Search aria-hidden="true" />
            </button>
            <a className="icon-btn" href="#/login" aria-label="Account">
              <UserRound aria-hidden="true" />
            </a>
            <a className="icon-btn" href="#/wishlist" aria-label="Wishlist">
              <Heart aria-hidden="true" />
              <Badge count={wishlist.length} />
            </a>
            <button
              className="icon-btn"
              type="button"
              aria-label="Cart"
              onClick={() => setDrawerOpen(true)}
            >
              <ShoppingBag aria-hidden="true" />
              <Badge count={cartCount} />
            </button>
          </div>
        </div>

        {searchOpen ? (
          <div className="search-bar">
            <div className="wrap">
              <input
                value={searchTerm}
                placeholder="Search for jeans, fits, colors..."
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "Enter") {
                    submitSearch();
                  }
                }}
              />
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <CurrentPage
          route={route}
          cart={cart}
          wishlist={wishlist}
          lastOrder={lastOrder}
          shopFilters={shopFilters}
          setShopFilters={setShopFilters}
          clearFilters={clearFilters}
          addToCart={addToCart}
          changeQty={changeQty}
          removeFromCart={removeFromCart}
          toggleWishlist={toggleWishlist}
          submitOrder={submitOrder}
          showToast={showToast}
        />
      </main>

      <Footer />
    </div>
  );
}

function CurrentPage({
  route,
  cart,
  wishlist,
  lastOrder,
  shopFilters,
  setShopFilters,
  clearFilters,
  addToCart,
  changeQty,
  removeFromCart,
  toggleWishlist,
  submitOrder,
  showToast,
}: {
  route: RouteState;
  cart: CartItem[];
  wishlist: number[];
  lastOrder: LastOrder | null;
  shopFilters: ShopFilters;
  setShopFilters: React.Dispatch<React.SetStateAction<ShopFilters>>;
  clearFilters: () => void;
  addToCart: (product: Product, size?: number, color?: ProductColor, qty?: number) => void;
  changeQty: (index: number, delta: number) => void;
  removeFromCart: (index: number) => void;
  toggleWishlist: (productId: number) => void;
  submitOrder: (event: FormEvent<HTMLFormElement>) => void;
  showToast: (message: string) => void;
}) {
  if (route.path === "/shop") {
    return (
      <ShopPage
        filters={shopFilters}
        setFilters={setShopFilters}
        clearFilters={clearFilters}
        wishlist={wishlist}
        addToCart={addToCart}
        toggleWishlist={toggleWishlist}
      />
    );
  }

  if (route.path.startsWith("/product/")) {
    const productId = Number(route.path.split("/")[2]);
    return (
      <ProductPage
        product={getProduct(productId)}
        wishlist={wishlist}
        addToCart={addToCart}
        toggleWishlist={toggleWishlist}
        showToast={showToast}
      />
    );
  }

  if (route.path === "/cart") {
    return (
      <CartPage cart={cart} changeQty={changeQty} removeFromCart={removeFromCart} subtotal={cart.reduce((sum, item) => sum + getProduct(item.id).price * item.qty, 0)} />
    );
  }

  if (route.path === "/checkout") {
    return <CheckoutPage cart={cart} submitOrder={submitOrder} />;
  }

  if (route.path === "/confirmation") {
    return <ConfirmationPage lastOrder={lastOrder} />;
  }

  if (route.path === "/login") {
    return <AuthPage showToast={showToast} />;
  }

  if (route.path === "/account") {
    return <AccountPage lastOrder={lastOrder} showToast={showToast} />;
  }

  if (route.path === "/wishlist") {
    return (
      <WishlistPage
        wishlist={wishlist}
        addToCart={addToCart}
        toggleWishlist={toggleWishlist}
      />
    );
  }

  if (route.path === "/about") {
    return <AboutPage />;
  }

  if (route.path === "/contact") {
    return <ContactPage showToast={showToast} />;
  }

  if (route.path === "/faq") {
    return <FaqPage selected={route.params.get("t") ?? "general"} />;
  }

  return (
    <HomeContent
      wishlist={wishlist}
      addToCart={addToCart}
      toggleWishlist={toggleWishlist}
      showToast={showToast}
    />
  );
}

function Badge({ count }: { count: number }) {
  if (!count) {
    return null;
  }

  return <span className="badge">{count}</span>;
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = [
    ["New In", "#/shop?f=new"],
    ["Shop", "#/shop"],
    ["Collections", "#/shop"],
    ["About", "#/about"],
    ["Contact", "#/contact"],
    ["Account", "#/login"],
  ];

  return (
    <aside className={cn("mobile-nav", open && "open")} aria-hidden={!open}>
      <button className="close-x" type="button" aria-label="Close menu" onClick={onClose}>
        <X aria-hidden="true" />
      </button>
      {items.map(([label, href]) => (
        <a href={href} key={label} onClick={onClose}>
          {label}
        </a>
      ))}
    </aside>
  );
}

function CartDrawer({
  open,
  cart,
  subtotal,
  delivery,
  onClose,
  onQty,
  onRemove,
}: {
  open: boolean;
  cart: CartItem[];
  subtotal: number;
  delivery: number;
  onClose: () => void;
  onQty: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <aside className={cn("cart-drawer", open && "open")} aria-hidden={!open}>
      <div className="drawer-head">
        <span className="serif">Your Bag</span>
        <button type="button" aria-label="Close cart" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="drawer-body">
        {cart.length ? (
          cart.map((item, index) => {
            const product = getProduct(item.id);
            return (
              <CartLine
                item={item}
                index={index}
                key={`${item.id}-${item.color}-${item.size}`}
                product={product}
                onQty={onQty}
                onRemove={onRemove}
                compact
              />
            );
          })
        ) : (
          <EmptyState
            icon={<ShoppingBag aria-hidden="true" />}
            title="Your bag is empty."
            actionLabel="Shop Now"
            actionHref="#/shop"
          />
        )}
      </div>
      {cart.length ? (
        <div className="drawer-foot">
          <SummaryRows subtotal={subtotal} delivery={delivery} />
          <a className="btn btn-dark btn-block" href="#/checkout">
            Checkout
          </a>
          <a className="btn btn-outline btn-block mt-sm" href="#/cart">
            View Bag
          </a>
        </div>
      ) : null}
    </aside>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className={cn("toast", message && "show")} aria-live="polite">
      <span className="dot" />
      <span>{message || "Added to bag"}</span>
    </div>
  );
}

function HomeContent({
  wishlist,
  addToCart,
  toggleWishlist,
  showToast,
}: {
  wishlist: number[];
  addToCart: (product: Product, size?: number, color?: ProductColor, qty?: number) => void;
  toggleWishlist: (productId: number) => void;
  showToast: (message: string) => void;
}) {
  const bestSellers = PRODUCTS.filter(
    (product) => product.badge === "Best Seller" || product.rating >= 4.7,
  ).slice(0, 4);
  const fitBackgrounds = ["#d8cdd9", "#e4ded0", "#cfd3c4", "#ded6de", "#c9c2cb"];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SS26 Collection - Made in Tunisia</span>
          <h1>
            MADE TO
            <br />
            <em>SHINE.</em>
          </h1>
          <div className="sunline" />
          <p className="lead">
            Premium jeans designed for women who move with confidence. Sculpted fits,
            sustainable denim, finished by hand in our Tunis ateliers.
          </p>
          <div className="hero-cta-row">
            <a href="#/shop" className="btn btn-dark">
              Shop Now
            </a>
            <a href="#/shop?f=new" className="btn btn-outline">
              New Arrivals
            </a>
          </div>
        </div>
        <div className="hero-art">
          <HeroArt />
        </div>
      </section>

      <section className="benefits wrap">
        <Benefit icon={<Truck aria-hidden="true" />} title="Free Delivery" text="On orders over 200 DT" />
        <Benefit icon={<RotateCcw aria-hidden="true" />} title="Easy Returns" text="14 days, no questions" />
        <Benefit icon={<Lock aria-hidden="true" />} title="Secure Payment" text="COD or online, always safe" />
        <Benefit icon={<UserRound aria-hidden="true" />} title="Made for You" text="Cuts built for real bodies" />
      </section>

      <section className="block wrap">
        <SectionHead eyebrow="Shop by Silhouette" title="Find Your Fit" />
        <div className="fits-grid">
          {FITS.map((fit, index) => (
            <button
              className="fit-card"
              key={fit}
              type="button"
              onClick={() => navigateTo(`#/shop?fit=${encodeURIComponent(fit)}`)}
            >
              <span className="fit-visual" style={{ background: fitBackgrounds[index] }}>
                <FitArt />
              </span>
              <span className="fit-label">
                <span>{fit}</span>
                <small>Shop the fit</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="block editorial wrap">
        <div className="editorial-inner">
          <span className="eyebrow">New Collection - Lueur</span>
          <h2>
            Denim, Reimagined
            <br />
            for Golden Hour.
          </h2>
          <p className="lead">
            A capsule of wide-leg and flare silhouettes in warm indigo washes, built for
            movement and styled for confidence.
          </p>
          <a href="#/shop" className="btn btn-lav">
            Explore the Edit
          </a>
        </div>
      </section>

      <section className="block wrap">
        <SectionHead
          eyebrow="Loved by our community"
          title="Best Sellers"
          action={
            <a href="#/shop" className="btn btn-outline btn-sm">
              View All
            </a>
          }
        />
        <ProductGrid
          products={bestSellers}
          wishlist={wishlist}
          addToCart={addToCart}
          toggleWishlist={toggleWishlist}
        />
      </section>

      <section className="block wrap story">
        <div className="story-visual">
          <DenimArt seed={9} tone="ivory" />
        </div>
        <div>
          <span className="eyebrow">Our Story</span>
          <h2>
            Woven in Tunisia,
            <br />
            Worn with Confidence.
          </h2>
          <p className="lead story-copy">
            SUNLINE began in a small Tunis atelier with one belief: denim should feel
            like it was made for you, not simply sold to you. Every pair is cut, washed
            and finished by artisans across Tunisia&apos;s textile heritage.
          </p>
          <a href="#/about" className="btn btn-outline">
            Discover Our Story
          </a>
        </div>
      </section>

      <section className="block wrap styled-by">
        <SectionHead eyebrow="@sunline.tn" title="Styled by You" />
        <div className="igrid">
          {[1, 2, 3, 4, 5].map((item) => (
            <div className="icell" key={item}>
              <DenimArt seed={item + 10} />
            </div>
          ))}
        </div>
      </section>

      <Newsletter showToast={showToast} />
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="benefit">
      {icon}
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

function ProductGrid({
  products,
  wishlist,
  addToCart,
  toggleWishlist,
}: {
  products: Product[];
  wishlist: number[];
  addToCart: (product: Product, size?: number, color?: ProductColor, qty?: number) => void;
  toggleWishlist: (productId: number) => void;
}) {
  if (!products.length) {
    return <p className="muted-empty">No products match these filters.</p>;
  }

  return (
    <div className="pgrid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          wished={wishlist.includes(product.id)}
          onWish={() => toggleWishlist(product.id)}
          onQuickAdd={() => addToCart(product)}
        />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  wished,
  onWish,
  onQuickAdd,
}: {
  product: Product;
  wished: boolean;
  onWish: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <article className="pcard" onClick={() => navigateTo(`#/product/${product.id}`)}>
      <div className="thumb">
        {product.badge ? (
          <span className={cn("badge-tag", product.badge === "Sale" && "alt")}>
            {product.badge}
          </span>
        ) : null}
        <button
          className={cn("wish-toggle", wished && "active")}
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(event) => {
            event.stopPropagation();
            onWish();
          }}
        >
          <Heart aria-hidden="true" />
        </button>
        <div className="art">
          <DenimArt seed={product.id} />
        </div>
        <div className="quick-add">
          <button
            className="btn btn-dark btn-sm btn-block"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickAdd();
            }}
          >
            Quick Add
          </button>
        </div>
      </div>
      <div className="info">
        <div className="name">{product.name}</div>
        <div className="meta">{product.fit}</div>
        <div className="meta">
          {product.oldPrice ? <span className="price-old">{money(product.oldPrice)}</span> : null}
          <strong>{money(product.price)}</strong>
        </div>
        <div className="swatches">
          {product.colors.map((color) => (
            <span
              className="swatch"
              key={color}
              style={{ background: COLOR_SWATCHES[color] }}
              title={color}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function ShopPage({
  filters,
  setFilters,
  clearFilters,
  wishlist,
  addToCart,
  toggleWishlist,
}: {
  filters: ShopFilters;
  setFilters: React.Dispatch<React.SetStateAction<ShopFilters>>;
  clearFilters: () => void;
  wishlist: number[];
  addToCart: (product: Product, size?: number, color?: ProductColor, qty?: number) => void;
  toggleWishlist: (productId: number) => void;
}) {
  const products = useMemo(() => {
    const filtered = PRODUCTS.filter((product) => {
      if (filters.fit.length && !filters.fit.includes(product.fit)) {
        return false;
      }
      if (filters.size.length && !product.sizes.some((size) => filters.size.includes(String(size)))) {
        return false;
      }
      if (filters.color.length && !product.colors.some((color) => filters.color.includes(color))) {
        return false;
      }
      if (filters.maxPrice && product.price > filters.maxPrice) {
        return false;
      }
      if (filters.badgeNew && product.badge !== "New") {
        return false;
      }
      if (
        filters.q &&
        !product.name.toLowerCase().includes(filters.q.toLowerCase()) &&
        !product.fit.toLowerCase().includes(filters.q.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    if (filters.sort === "price-asc") {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (filters.sort === "price-desc") {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    if (filters.sort === "rating") {
      return [...filtered].sort((a, b) => b.rating - a.rating);
    }

    return filtered;
  }, [filters]);

  const toggleListFilter = (key: "fit" | "size", value: string) => {
    setFilters((current) => {
      const values = current[key] as string[];
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [key]: next };
    });
  };

  const toggleColorFilter = (color: ProductColor) => {
    setFilters((current) => ({
      ...current,
      color: current.color.includes(color)
        ? current.color.filter((item) => item !== color)
        : [...current.color, color],
    }));
  };

  return (
    <>
      <Breadcrumb items={["Home", "Shop"]} />
      <div className="wrap shop-head">
        <span className="eyebrow">All Jeans</span>
        <h1>Shop Denim</h1>
      </div>
      <div className="wrap shop-layout">
        <aside className="filters">
          <FilterGroup title="Fit">
            {FITS.map((fit) => (
              <label className="filter-opt" key={fit}>
                <input
                  type="checkbox"
                  checked={filters.fit.includes(fit)}
                  onChange={() => toggleListFilter("fit", fit)}
                />
                {fit}
              </label>
            ))}
          </FilterGroup>

          <FilterGroup title="Size">
            {[34, 36, 38, 40, 42].map((size) => (
              <label className="filter-opt" key={size}>
                <input
                  type="checkbox"
                  checked={filters.size.includes(String(size))}
                  onChange={() => toggleListFilter("size", String(size))}
                />
                EU {size}
              </label>
            ))}
          </FilterGroup>

          <FilterGroup title="Color">
            <div className="color-filters">
              {Object.entries(COLOR_SWATCHES).map(([color, value]) => {
                if (!isProductColor(color)) {
                  return null;
                }

                return (
                  <button
                    className={cn("color-dot", filters.color.includes(color) && "selected")}
                    key={color}
                    type="button"
                    style={{ background: value }}
                    title={color}
                    onClick={() => toggleColorFilter(color)}
                  />
                );
              })}
            </div>
          </FilterGroup>

          <FilterGroup title={`Price up to ${filters.maxPrice} DT`}>
            <input
              className="range"
              type="range"
              min="150"
              max="250"
              value={filters.maxPrice}
              onChange={(event) =>
                setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) }))
              }
            />
          </FilterGroup>

          <FilterGroup title="Availability">
            <label className="filter-opt">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, inStock: event.target.checked }))
                }
              />
              In stock only
            </label>
          </FilterGroup>

          <button className="btn btn-outline btn-sm btn-block" type="button" onClick={clearFilters}>
            Clear Filters
          </button>
        </aside>

        <div>
          <div className="toolbar">
            <span className="result-count">{products.length} products</span>
            <select
              className="select-min"
              value={filters.sort}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sort: event.target.value as ShopFilters["sort"],
                }))
              }
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <ProductGrid
            products={products}
            wishlist={wishlist}
            addToCart={addToCart}
            toggleWishlist={toggleWishlist}
          />
        </div>
      </div>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="filter-group">
      <h5>{title}</h5>
      {children}
    </div>
  );
}

function ProductPage({
  product,
  wishlist,
  addToCart,
  toggleWishlist,
  showToast,
}: {
  product: Product;
  wishlist: number[];
  addToCart: (product: Product, size?: number, color?: ProductColor, qty?: number) => void;
  toggleWishlist: (productId: number) => void;
  showToast: (message: string) => void;
}) {
  const [color, setColor] = useState<ProductColor>(product.colors[0]);
  const [size, setSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);
  const [openAccordions, setOpenAccordions] = useState(["details"]);

  useEffect(() => {
    setColor(product.colors[0]);
    setSize(null);
    setQty(1);
    setThumb(0);
    setOpenAccordions(["details"]);
  }, [product]);

  const related = PRODUCTS.filter((item) => item.fit === product.fit && item.id !== product.id).slice(0, 4);

  const addFromPdp = () => {
    if (!size) {
      showToast("Please select a size");
      return;
    }

    addToCart(product, size, color, qty);
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <>
      <Breadcrumb items={["Home", "Shop", product.name]} />
      <div className="wrap pdp">
        <div>
          <div className="gallery-main">
            <DenimArt seed={product.id + thumb} />
          </div>
          <div className="gallery-thumbs">
            {[0, 1, 2].map((item) => (
              <button
                className={cn("th", thumb === item && "active")}
                key={item}
                type="button"
                onClick={() => setThumb(item)}
              >
                <DenimArt seed={product.id + item} />
              </button>
            ))}
          </div>
        </div>

        <div className="pdp-info">
          <span className="eyebrow">{product.fit} - SUNLINE</span>
          <h1>{product.name}</h1>
          <div className="price-row">
            {product.oldPrice ? <span className="price-old price-old-lg">{money(product.oldPrice)}</span> : null}
            <span className="price-now">{money(product.price)}</span>
          </div>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((item) => (
              <Star key={item} aria-hidden="true" />
            ))}
            <span>
              {product.rating} ({product.reviews} reviews)
            </span>
          </div>

          <div className="opt-block">
            <div className="opt-label">
              Color: <strong>{color}</strong>
            </div>
            <div className="color-opts">
              {product.colors.map((item) => (
                <button
                  className={cn("c", color === item && "selected")}
                  key={item}
                  type="button"
                  title={item}
                  style={{ background: COLOR_SWATCHES[item] }}
                  onClick={() => setColor(item)}
                />
              ))}
            </div>
          </div>

          <div className="opt-block">
            <div className="opt-label">
              <span>Size</span>
              <button type="button" onClick={() => showToast("EU sizes 34-42 are available by fit.")}>
                Size Guide
              </button>
            </div>
            <div className="size-opts">
              {[34, 36, 38, 40, 42].map((item) => (
                <button
                  className={cn(size === item && "selected")}
                  disabled={!product.sizes.includes(item)}
                  key={item}
                  type="button"
                  onClick={() => setSize(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="opt-block">
            <div className="opt-label">Quantity</div>
            <QtyBox qty={qty} onQty={(delta) => setQty((current) => Math.max(1, current + delta))} />
          </div>

          <div className="pdp-actions">
            <button className="btn btn-dark" type="button" onClick={addFromPdp}>
              Add to Cart
            </button>
            <button
              className={cn("wish-toggle pdp-wish", wishlist.includes(product.id) && "active")}
              type="button"
              aria-label="Toggle wishlist"
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart aria-hidden="true" />
            </button>
          </div>

          <div className="trust-mini">
            <span>
              <Truck aria-hidden="true" /> Free delivery over 200 DT
            </span>
            <span>
              <RotateCcw aria-hidden="true" /> 14-day returns
            </span>
            <span>
              <Lock aria-hidden="true" /> COD available
            </span>
          </div>

          <div className="accordion">
            <AccordionItem
              id="details"
              title="Details"
              open={openAccordions.includes("details")}
              onToggle={toggleAccordion}
            >
              {product.desc} Mid-weight stretch denim, 98% cotton / 2% elastane.
              Designed in Tunis, finished in our partner ateliers across Tunisia.
            </AccordionItem>
            <AccordionItem
              id="shipping"
              title="Shipping"
              open={openAccordions.includes("shipping")}
              onToggle={toggleAccordion}
            >
              Delivered across all 24 governorates of Tunisia in 2-4 business days.
              Free delivery on orders over 200 DT, otherwise a flat 8 DT delivery fee
              applies.
            </AccordionItem>
            <AccordionItem
              id="care"
              title="Care"
              open={openAccordions.includes("care")}
              onToggle={toggleAccordion}
            >
              Machine wash cold, inside out, with similar colors. Avoid tumble drying
              to preserve shape and wash.
            </AccordionItem>
          </div>
        </div>
      </div>

      <section className="block wrap related">
        <SectionHead eyebrow="You may also like" title="Complete the Look" />
        <ProductGrid
          products={related}
          wishlist={wishlist}
          addToCart={addToCart}
          toggleWishlist={toggleWishlist}
        />
      </section>
    </>
  );
}

function AccordionItem({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("accordion-item", open && "open")}>
      <button className="acc-head" type="button" onClick={() => onToggle(id)}>
        {title} <Plus className="plus" aria-hidden="true" />
      </button>
      <div className="acc-body">
        <div className="acc-body-inner">{children}</div>
      </div>
    </div>
  );
}

function CartPage({
  cart,
  subtotal,
  changeQty,
  removeFromCart,
}: {
  cart: CartItem[];
  subtotal: number;
  changeQty: (index: number, delta: number) => void;
  removeFromCart: (index: number) => void;
}) {
  if (!cart.length) {
    return (
      <EmptyState
        icon={<ShoppingBag aria-hidden="true" />}
        title="Your bag is empty"
        text="Looks like you haven't added anything yet."
        actionLabel="Start Shopping"
        actionHref="#/shop"
      />
    );
  }

  const delivery = subtotal >= 200 ? 0 : 8;

  return (
    <>
      <Breadcrumb items={["Home", "Cart"]} />
      <div className="wrap page-title">
        <h1>Your Bag</h1>
      </div>
      <div className="wrap cart-layout">
        <div>
          {cart.map((item, index) => (
            <CartLine
              item={item}
              index={index}
              product={getProduct(item.id)}
              key={`${item.id}-${item.color}-${item.size}`}
              onQty={changeQty}
              onRemove={removeFromCart}
            />
          ))}
        </div>
        <div className="summary-box">
          <h3>Order Summary</h3>
          <SummaryRows subtotal={subtotal} delivery={delivery} />
          {subtotal < 200 ? (
            <p className="shipping-note">Add {money(200 - subtotal)} more for free delivery</p>
          ) : null}
          <div className="promo-row">
            <input placeholder="Promo code" />
            <button className="btn btn-outline btn-sm" type="button">
              Apply
            </button>
          </div>
          <a className="btn btn-dark btn-block mt" href="#/checkout">
            Proceed to Checkout
          </a>
          <a className="continue-link" href="#/shop">
            Continue Shopping
          </a>
        </div>
      </div>
    </>
  );
}

function CartLine({
  item,
  index,
  product,
  onQty,
  onRemove,
  compact = false,
}: {
  item: CartItem;
  index: number;
  product: Product;
  onQty: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("cart-line", compact && "compact")}>
      <div className="cimg">
        <DenimArt seed={product.id} />
      </div>
      <div>
        <div className="cname">{product.name}</div>
        <div className="cmeta">
          {item.color} - Size {item.size}
        </div>
        <QtyBox qty={item.qty} onQty={(delta) => onQty(index, delta)} compact />
      </div>
      <div className="cart-line-actions">
        <div className="cprice">{money(product.price * item.qty)}</div>
        <button className="remove-link" type="button" onClick={() => onRemove(index)}>
          Remove
        </button>
      </div>
    </div>
  );
}

function QtyBox({
  qty,
  onQty,
  compact = false,
}: {
  qty: number;
  onQty: (delta: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("qty-box", compact && "compact")}>
      <button type="button" aria-label="Decrease quantity" onClick={() => onQty(-1)}>
        <Minus aria-hidden="true" />
      </button>
      <span>{qty}</span>
      <button type="button" aria-label="Increase quantity" onClick={() => onQty(1)}>
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}

function SummaryRows({ subtotal, delivery }: { subtotal: number; delivery: number }) {
  return (
    <>
      <div className="sum-row">
        <span>Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      <div className="sum-row">
        <span>Delivery</span>
        <span>{delivery === 0 ? "Free" : money(delivery)}</span>
      </div>
      <div className="sum-row total">
        <span>Total</span>
        <span>{money(subtotal + delivery)}</span>
      </div>
    </>
  );
}

function CheckoutPage({
  cart,
  submitOrder,
}: {
  cart: CartItem[];
  submitOrder: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const subtotal = cart.reduce((sum, item) => sum + getProduct(item.id).price * item.qty, 0);
  const delivery = subtotal >= 200 || subtotal === 0 ? 0 : 8;

  return (
    <>
      <Breadcrumb items={["Home", "Cart", "Checkout"]} />
      <div className="wrap">
        <div className="checkout-steps">
          <span>Bag</span>
          <span>-</span>
          <span className="active">Delivery & Payment</span>
          <span>-</span>
          <span>Confirmation</span>
        </div>
      </div>
      <div className="wrap checkout-layout">
        <form onSubmit={submitOrder}>
          <h3 className="mini-title">Contact & Delivery</h3>
          <FormField label="Full Name">
            <input required placeholder="e.g. Amal Ben Salah" />
          </FormField>
          <div className="form-row2">
            <FormField label="Phone Number">
              <input required placeholder="+216 XX XXX XXX" pattern="^\+?216?[0-9\s]{8,}$" />
            </FormField>
            <FormField label="Email (optional)">
              <input type="email" placeholder="you@email.com" />
            </FormField>
          </div>
          <FormField label="Address">
            <input required placeholder="Street, apartment, building" />
          </FormField>
          <div className="form-row2">
            <FormField label="City">
              <input required placeholder="e.g. Ariana" />
            </FormField>
            <FormField label="Postal Code">
              <input required placeholder="e.g. 2080" pattern="[0-9]{4}" />
            </FormField>
          </div>
          <FormField label="Governorate">
            <select required defaultValue="">
              <option value="" disabled>
                Select governorate
              </option>
              {GOVERNORATES.map((governorate) => (
                <option key={governorate}>{governorate}</option>
              ))}
            </select>
          </FormField>
          <h3 className="mini-title payment-title">Payment Method</h3>
          <PaymentOptions />
          <FormField label="Order Notes (optional)">
            <textarea rows={3} placeholder="Delivery instructions, landmark, etc." />
          </FormField>
          <button type="submit" className="btn btn-dark btn-block mt">
            Place Order
          </button>
        </form>
        <OrderSummary cart={cart} subtotal={subtotal} delivery={delivery} />
      </div>
    </>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PaymentOptions() {
  const [method, setMethod] = useState("cod");

  return (
    <>
      <label className={cn("radio-card", method === "cod" && "selected")}>
        <input
          type="radio"
          name="pay"
          checked={method === "cod"}
          onChange={() => setMethod("cod")}
        />
        <span>
          <strong>Cash on Delivery</strong>
          <small>Pay in cash when your order arrives.</small>
        </span>
      </label>
      <label className={cn("radio-card", method === "online" && "selected")}>
        <input
          type="radio"
          name="pay"
          checked={method === "online"}
          onChange={() => setMethod("online")}
        />
        <span>
          <strong>Online Payment</strong>
          <small>Pay securely now by card (TND).</small>
        </span>
      </label>
    </>
  );
}

function OrderSummary({
  cart,
  subtotal,
  delivery,
}: {
  cart: CartItem[];
  subtotal: number;
  delivery: number;
}) {
  return (
    <div className="summary-box">
      <h3>Order Summary</h3>
      {cart.length ? (
        cart.map((item) => {
          const product = getProduct(item.id);
          return (
            <div className="sum-row" key={`${item.id}-${item.color}-${item.size}`}>
              <span>
                {product.name} ({item.qty}) - {item.size}
              </span>
              <span>{money(product.price * item.qty)}</span>
            </div>
          );
        })
      ) : (
        <div className="sum-row">
          <span>Your bag is empty</span>
        </div>
      )}
      <SummaryRows subtotal={subtotal} delivery={delivery} />
    </div>
  );
}

function ConfirmationPage({ lastOrder }: { lastOrder: LastOrder | null }) {
  if (!lastOrder) {
    return (
      <div className="wrap confirm-wrap">
        <h2>No recent order found</h2>
        <a className="btn btn-dark mt" href="#/shop">
          Go to Shop
        </a>
      </div>
    );
  }

  const delivery = lastOrder.subtotal >= 200 ? 0 : 8;

  return (
    <div className="wrap confirm-wrap">
      <div className="confirm-icon">
        <Check aria-hidden="true" />
      </div>
      <span className="eyebrow">Thank you for your order</span>
      <h1>Order Confirmed</h1>
      <p>
        Your order <strong>#{lastOrder.id}</strong> has been placed and will be
        delivered across Tunisia within 2-4 business days.
      </p>
      <div className="order-box">
        {lastOrder.items.map((item) => {
          const product = getProduct(item.id);
          return (
            <div className="row" key={`${item.id}-${item.color}-${item.size}`}>
              <span>
                {product.name} - {item.color}, {item.size} (x{item.qty})
              </span>
              <span>{money(product.price * item.qty)}</span>
            </div>
          );
        })}
        <div className="row">
          <span>Delivery</span>
          <span>{delivery === 0 ? "Free" : money(delivery)}</span>
        </div>
        <div className="row strong">
          <span>Total</span>
          <span>{money(lastOrder.subtotal + delivery)}</span>
        </div>
        <div className="row">
          <span>Order Date</span>
          <span>{lastOrder.date}</span>
        </div>
      </div>
      <div className="confirm-actions">
        <a className="btn btn-dark" href="#/shop">
          Continue Shopping
        </a>
        <a className="btn btn-outline" href="#/account">
          Track Order
        </a>
      </div>
    </div>
  );
}

function AuthPage({ showToast }: { showToast: (message: string) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");

  const submit = (event: FormEvent<HTMLFormElement>, mode: "login" | "register") => {
    event.preventDefault();
    showToast(mode === "login" ? "Welcome back to SUNLINE" : "Account created - welcome to SUNLINE");
    navigateTo("#/account");
  };

  return (
    <div className="wrap auth-wrap">
      <div className="center-txt auth-head">
        <span className="eyebrow">Welcome to SUNLINE</span>
        <h1>Account Access</h1>
      </div>
      <div className="auth-tabs">
        <button
          className={cn(tab === "login" && "active")}
          type="button"
          onClick={() => setTab("login")}
        >
          Sign In
        </button>
        <button
          className={cn(tab === "register" && "active")}
          type="button"
          onClick={() => setTab("register")}
        >
          Create Account
        </button>
      </div>

      {tab === "login" ? (
        <form onSubmit={(event) => submit(event, "login")}>
          <FormField label="Email">
            <input type="email" required placeholder="you@email.com" />
          </FormField>
          <FormField label="Password">
            <input type="password" required placeholder="Password" />
          </FormField>
          <a className="tiny-link" href="#/login">
            Forgot password?
          </a>
          <button className="btn btn-dark btn-block" type="submit">
            Sign In
          </button>
          <div className="or-div">or</div>
          <button
            className="btn btn-outline btn-block"
            type="button"
            onClick={() => showToast("Continuing with Google")}
          >
            Continue with Google
          </button>
        </form>
      ) : (
        <form onSubmit={(event) => submit(event, "register")}>
          <FormField label="Full Name">
            <input required placeholder="Your name" />
          </FormField>
          <FormField label="Phone Number">
            <input required placeholder="+216 XX XXX XXX" />
          </FormField>
          <FormField label="Email">
            <input type="email" required placeholder="you@email.com" />
          </FormField>
          <FormField label="Password">
            <input type="password" required placeholder="Create a password" />
          </FormField>
          <button className="btn btn-dark btn-block" type="submit">
            Create Account
          </button>
        </form>
      )}
    </div>
  );
}

function AccountPage({
  lastOrder,
  showToast,
}: {
  lastOrder: LastOrder | null;
  showToast: (message: string) => void;
}) {
  return (
    <>
      <Breadcrumb items={["Home", "My Account"]} />
      <div className="wrap page-title">
        <h1>My Account</h1>
      </div>
      <div className="wrap account-layout">
        <nav className="account-nav" aria-label="Account">
          <a className="active" href="#/account">
            Overview
          </a>
          <a href="#/account">Orders</a>
          <a href="#/wishlist">Wishlist</a>
          <a href="#/account">Addresses</a>
          <a href="#/account">Account Details</a>
          <a href="#/login" onClick={() => showToast("Signed out")}>
            Sign Out
          </a>
        </nav>
        <div>
          <div className="profile-card">
            <span className="eyebrow">Welcome back</span>
            <h2>Amal Ben Salah</h2>
            <p>amal.bensalah@email.com - +216 22 345 678</p>
          </div>
          <h3 className="mini-title order-title">Recent Orders</h3>
          {lastOrder ? (
            <OrderRow
              id={lastOrder.id}
              date={lastOrder.date}
              items={`${lastOrder.items.length} item(s)`}
              total={money(lastOrder.subtotal)}
              status="Processing"
            />
          ) : null}
          <OrderRow id="SL482910" date="02 July 2026" items="2 item(s)" total="368 DT" status="Delivered" />
          <OrderRow id="SL471002" date="14 May 2026" items="1 item" total="189 DT" status="Delivered" />
        </div>
      </div>
    </>
  );
}

function OrderRow({
  id,
  date,
  items,
  total,
  status,
}: {
  id: string;
  date: string;
  items: string;
  total: string;
  status: "Processing" | "Delivered";
}) {
  return (
    <div className="order-row">
      <div>
        <strong>#{id}</strong>
        <div>
          {date} - {items}
        </div>
      </div>
      <span className={cn("status-pill", status === "Delivered" && "delivered")}>{status}</span>
      <span className="order-total">{total}</span>
    </div>
  );
}

function WishlistPage({
  wishlist,
  addToCart,
  toggleWishlist,
}: {
  wishlist: number[];
  addToCart: (product: Product, size?: number, color?: ProductColor, qty?: number) => void;
  toggleWishlist: (productId: number) => void;
}) {
  const items = PRODUCTS.filter((product) => wishlist.includes(product.id));

  return (
    <>
      <Breadcrumb items={["Home", "Wishlist"]} />
      <div className="wrap page-title wishlist-title">
        <h1>Your Wishlist</h1>
        <p>{items.length} saved item(s)</p>
      </div>
      <div className="wrap wishlist-body">
        {items.length ? (
          <ProductGrid
            products={items}
            wishlist={wishlist}
            addToCart={addToCart}
            toggleWishlist={toggleWishlist}
          />
        ) : (
          <EmptyState
            icon={<Heart aria-hidden="true" />}
            title="Your wishlist is empty"
            text="Save your favourite pieces to find them here."
            actionLabel="Explore Jeans"
            actionHref="#/shop"
          />
        )}
      </div>
    </>
  );
}

function AboutPage() {
  return (
    <>
      <Breadcrumb items={["Home", "About"]} />
      <section className="wrap about-hero">
        <div>
          <span className="eyebrow">Est. Tunis</span>
          <h1>
            Denim Rooted in
            <br />
            Tunisian Craft.
          </h1>
          <p className="lead">
            SUNLINE was founded on a simple idea: premium denim should not require
            compromise between comfort, ethics and elegance. We work with Tunisian
            ateliers to create jeans that fit real bodies and move with real lives.
          </p>
          <div className="stat-row">
            <Stat value="12+" label="Fits Perfected" />
            <Stat value="100%" label="Made in Tunisia" />
            <Stat value="24" label="Governorates Delivered" />
          </div>
        </div>
        <div className="story-visual">
          <DenimArt seed={20} tone="ivory" />
        </div>
      </section>

      <section className="block wrap values-section">
        <SectionHead eyebrow="What We Stand For" title="Our Values" />
        <div className="values-grid">
          <ValueCard number="01" title="Craft">
            Every piece is finished by hand across partner ateliers, blending heritage
            technique with modern fit engineering.
          </ValueCard>
          <ValueCard number="02" title="Confidence">
            We design for the body women actually have: sculpted, supportive and never
            restrictive.
          </ValueCard>
          <ValueCard number="03" title="Responsibility">
            Lower-impact washes, responsibly sourced cotton and fair partnerships with
            our ateliers.
          </ValueCard>
        </div>
      </section>

      <section className="block wrap story">
        <div className="story-visual">
          <DenimArt seed={21} />
        </div>
        <div>
          <span className="eyebrow">The Atelier</span>
          <h2>
            From Tunis to
            <br />
            Your Wardrobe.
          </h2>
          <p className="lead story-copy">
            Each SUNLINE piece passes through the hands of over a dozen artisans, from
            pattern cutting to the final wash, before it reaches you.
          </p>
          <a href="#/shop" className="btn btn-dark">
            Shop the Collection
          </a>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="n">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function ValueCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="value-card">
      <span className="n">{number}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

function ContactPage({ showToast }: { showToast: (message: string) => void }) {
  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Message sent - we will reply within 24h");
  };

  return (
    <>
      <Breadcrumb items={["Home", "Contact"]} />
      <div className="wrap contact-head">
        <span className="eyebrow">Get in Touch</span>
        <h1>We&apos;d Love to Hear From You</h1>
      </div>
      <div className="wrap contact-layout">
        <div>
          <ContactInfo icon={<Mail aria-hidden="true" />} label="Email" value="hello@sunline.tn" />
          <ContactInfo icon={<Phone aria-hidden="true" />} label="Phone / WhatsApp" value="+216 71 234 567" />
          <ContactInfo icon={<MapPin aria-hidden="true" />} label="Flagship Store" value="Avenue Habib Bourguiba, Tunis 1000" />
          <ContactInfo icon={<Clock aria-hidden="true" />} label="Hours" value="Mon - Sat, 9:00 - 19:00" />
        </div>
        <form onSubmit={submitContact}>
          <FormField label="Full Name">
            <input required placeholder="Your name" />
          </FormField>
          <FormField label="Email">
            <input type="email" required placeholder="you@email.com" />
          </FormField>
          <FormField label="Phone">
            <input placeholder="+216 XX XXX XXX" />
          </FormField>
          <FormField label="Message">
            <textarea rows={5} required placeholder="How can we help?" />
          </FormField>
          <button className="btn btn-dark btn-block" type="submit">
            Send Message
          </button>
        </form>
      </div>
    </>
  );
}

function ContactInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="contact-info-card">
      {icon}
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

const FAQS = {
  general: [
    {
      q: "What sizes does SUNLINE offer?",
      a: "We offer EU sizes 34 to 42 across most fits. Check the Size Guide on each product page for detailed measurements and conversions.",
    },
    {
      q: "Is SUNLINE denim made in Tunisia?",
      a: "Yes. Every SUNLINE piece is designed in Tunis and cut, washed and finished by artisans in partner ateliers across Tunisia.",
    },
  ],
  shipping: [
    {
      q: "Where do you deliver?",
      a: "We deliver to all 24 governorates of Tunisia, typically within 2-4 business days.",
    },
    {
      q: "How much does delivery cost?",
      a: "Delivery is free on orders over 200 DT. Orders below that threshold have a flat delivery fee of 8 DT.",
    },
    {
      q: "Can I pay cash on delivery?",
      a: "Yes, Cash on Delivery is available across Tunisia, alongside secure online card payment.",
    },
  ],
  returns: [
    {
      q: "What is your return policy?",
      a: "You may return unworn items with tags attached within 14 days of delivery for a full refund or exchange.",
    },
    {
      q: "How do I start a return?",
      a: "Contact our team via the Contact page or WhatsApp with your order number, and we will arrange a pickup or drop-off point.",
    },
  ],
};

function FaqPage({ selected }: { selected: string }) {
  const category = selected in FAQS ? (selected as keyof typeof FAQS) : "general";
  const [open, setOpen] = useState<string[]>([]);

  useEffect(() => {
    setOpen([]);
  }, [category]);

  return (
    <>
      <Breadcrumb items={["Home", "FAQ"]} />
      <div className="wrap faq-wrap">
        <span className="eyebrow">Help Center</span>
        <h1>FAQ, Shipping & Returns</h1>
        <div className="faq-cats">
          {(["general", "shipping", "returns"] as const).map((item) => (
            <a
              className={cn("faq-cat-btn", category === item && "active")}
              href={`#/faq?t=${item}`}
              key={item}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </a>
          ))}
        </div>
        <div>
          {FAQS[category].map((item) => (
            <div className="faq-item" key={item.q}>
              <button
                type="button"
                onClick={() =>
                  setOpen((current) =>
                    current.includes(item.q)
                      ? current.filter((value) => value !== item.q)
                      : [...current, item.q],
                  )
                }
              >
                {item.q} <span>{open.includes(item.q) ? "-" : "+"}</span>
              </button>
              <div className={cn("acc-body", open.includes(item.q) && "open")}>
                <div className="acc-body-inner">{item.a}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="support-box">
          <p>Still need help?</p>
          <a className="btn btn-dark" href="#/contact">
            Contact Support
          </a>
        </div>
      </div>
    </>
  );
}

function Newsletter({ showToast }: { showToast: (message: string) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Welcome to SUNLINE - check your inbox.");
  };

  return (
    <section className="newsletter">
      <div className="wrap">
        <span className="eyebrow">Stay in the Loop</span>
        <h2>Join the SUNLINE List</h2>
        <p>
          Be first to know about new drops, private sales and styling notes, plus 10%
          off your first order.
        </p>
        <form className="news-form" onSubmit={submit}>
          <input type="email" required placeholder="Enter your email address" />
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </section>
  );
}

function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div className="wrap crumb">
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>
          {index === 0 ? <a href="#/">Home</a> : item}
          {index < items.length - 1 ? " / " : ""}
        </span>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="wrap empty-state">
      {icon}
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
      {actionLabel && actionHref ? (
        <a className="btn btn-dark" href={actionHref}>
          {actionLabel}
        </a>
      ) : null}
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
            <p>
              Premium denim designed and finished in Tunisia, for women who move with
              confidence.
            </p>
            <div className="sunline" />
          </div>
          <FooterColumn
            title="Shop"
            links={[
              ["New In", "#/shop?f=new"],
              ["Best Sellers", "#/shop"],
              ["All Jeans", "#/shop"],
              ["Wishlist", "#/wishlist"],
            ]}
          />
          <FooterColumn
            title="Support"
            links={[
              ["FAQ", "#/faq"],
              ["Shipping", "#/faq?t=shipping"],
              ["Returns", "#/faq?t=returns"],
              ["Contact Us", "#/contact"],
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              ["About SUNLINE", "#/about"],
              ["Our Stores", "#/contact"],
              ["Careers", "#/about"],
              ["Sustainability", "#/about"],
            ]}
          />
        </div>
        <div className="foot-bottom">
          <span>Copyright 2026 SUNLINE Tunisia. All rights reserved.</span>
          <span className="pay-icons">
            <span>COD</span>
            <span>/</span>
            <span>CARTE BANCAIRE</span>
            <span>/</span>
            <span>TND</span>
          </span>
          <span>FR / AR</span>
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
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
