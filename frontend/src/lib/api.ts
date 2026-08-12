import { ProductListOut, ProductDetailOut, FitType, SortOption } from "@/types/product";
import { CartOut, CartItemIn, CartItemQuantityIn, WishlistOut } from "@/types/cart";
import { UserRegister, UserLogin, UserOut, TokenOut } from "@/types/auth";
import { CheckoutIn, OrderOut, OrderListItemOut } from "@/types/order";

const API_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

// --- Token storage --------------------------------------------------
// Access token lives in memory + localStorage (survives refresh, lost
// on tab close is NOT true for localStorage — it persists). The
// refresh token itself is never touched here: it's an httpOnly cookie
// set by the backend, invisible to JS by design (that's the point).
const TOKEN_KEY = "sunline_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// --- Core fetch wrapper ----------------------------------------------
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include", // sends the refresh-token cookie on every call
    cache: "no-store", // ← add this: product/cart/order data changes via admin
                      //   uploads and checkout, so it must never be cached
                      //   by Next.js's fetch data cache
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ? JSON.stringify(body.detail) : detail;
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new ApiError(res.status, detail);
  }

  // 204/some DELETEs may have no body
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

// --- Products ----------------------------------------------------------
export interface ProductFilters {
  fit?: FitType;
  min_price?: number;
  max_price?: number;
  color?: string;
  size?: string; // string, matching the API — pass "36" not 36
  q?: string;
  in_stock?: boolean;
  sort?: SortOption;
}

export function getProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  return apiFetch<ProductListOut[]>(`/api/products${qs ? `?${qs}` : ""}`);
}

export function getProductBySlug(slug: string) {
  return apiFetch<ProductDetailOut>(`/api/products/${slug}`);
}

// --- Auth ----------------------------------------------------------
export async function register(payload: UserRegister) {
  return apiFetch<UserOut>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: UserLogin) {
  const data = await apiFetch<TokenOut>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAccessToken(data.access_token);
  return data;
}

export async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST", auth: true });
  setAccessToken(null);
}

export function getMe() {
  return apiFetch<UserOut>("/api/auth/me", { auth: true });
}

export async function refreshToken() {
  const data = await apiFetch<TokenOut>("/api/auth/refresh", { method: "POST" });
  setAccessToken(data.access_token);
  return data;
}

// --- Cart (requires auth — see note below) --------------------------
export function getCart() {
  return apiFetch<CartOut>("/api/cart", { auth: true });
}

export function addCartItem(payload: CartItemIn) {
  return apiFetch<CartOut>("/api/cart/items", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function updateCartItem(variantId: string, payload: CartItemQuantityIn) {
  return apiFetch<CartOut>(`/api/cart/items/${variantId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function removeCartItem(variantId: string) {
  return apiFetch<CartOut>(`/api/cart/items/${variantId}`, {
    method: "DELETE",
    auth: true,
  });
}

// --- Wishlist (requires auth) ----------------------------------------
export function getWishlist() {
  return apiFetch<WishlistOut>("/api/wishlist", { auth: true });
}

export function addWishlistItem(productId: string) {
  return apiFetch<WishlistOut>(`/api/wishlist/items/${productId}`, {
    method: "POST",
    auth: true,
  });
}

export function removeWishlistItem(productId: string) {
  return apiFetch<WishlistOut>(`/api/wishlist/items/${productId}`, {
    method: "DELETE",
    auth: true,
  });
}


// --- Orders ----------------------------------------------------------
/** POST /api/orders — works for both guests (no auth header) and logged-in users */
export function checkout(payload: CheckoutIn) {
  return apiFetch<OrderOut>("/api/orders", {
    method: "POST",
    auth: true, // sends token if available, harmless if not
    body: JSON.stringify(payload),
  });
}

/** GET /api/orders — requires auth; returns slim list items */
export function getMyOrders() {
  return apiFetch<OrderListItemOut[]>("/api/orders", { auth: true });
}

/** GET /api/orders/{order_number} — no auth header needed for guest orders */
export function getOrderByNumber(orderNumber: string) {
  return apiFetch<OrderOut>(`/api/orders/${orderNumber}`);
}

export { ApiError };
