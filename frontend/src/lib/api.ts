import { ProductListOut, ProductDetailOut, FitType, SortOption } from "@/types/product";
import { CartOut, CartItemIn, CartItemQuantityIn, WishlistOut } from "@/types/cart";
import { UserRegister, UserLogin, UserOut, TokenOut } from "@/types/auth";
import { CheckoutIn, OrderOut, OrderListItemOut } from "@/types/order";
import {
  ProductCreateIn,
  ProductUpdateIn,
  ProductVariantCreateIn,
  ProductVariantUpdateIn,
  AdminOrderListItemOut,
  OrderStatusUpdateIn,
} from "@/types/admin";

const API_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

// --- Token storage --------------------------------------------------
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
    credentials: "include",
    cache: "no-store",
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

  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

// --- Products ----------------------------------------------------------
export interface ProductFilters {
  fit?: FitType;
  min_price?: number;
  max_price?: number;
  color?: string;
  size?: string;
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

// --- Cart --------------------------
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

// --- Wishlist ----------------------------------------
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
export function checkout(payload: CheckoutIn) {
  return apiFetch<OrderOut>("/api/orders", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getMyOrders() {
  return apiFetch<OrderListItemOut[]>("/api/orders", { auth: true });
}

export function getOrderByNumber(orderNumber: string) {
  return apiFetch<OrderOut>(`/api/orders/${orderNumber}`);
}

// =======================================================================
// ADMIN
// All admin calls need auth: true — get_current_admin_user requires a
// valid Bearer token belonging to a user with is_admin = true. A 403
// here means "logged in but not an admin," a 401 means "not logged in
// at all" — the admin layout distinguishes between these.
// =======================================================================

export function adminListProducts() {
  return apiFetch<ProductDetailOut[]>("/api/admin/products", { auth: true });
}

export function adminGetProduct(productId: string) {
  return apiFetch<ProductDetailOut>(`/api/admin/products/${productId}`, { auth: true });
}

export function adminCreateProduct(payload: ProductCreateIn) {
  return apiFetch<ProductDetailOut>("/api/admin/products", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminUpdateProduct(productId: string, payload: ProductUpdateIn) {
  return apiFetch<ProductDetailOut>(`/api/admin/products/${productId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminDeleteProduct(productId: string) {
  return apiFetch<void>(`/api/admin/products/${productId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function adminCreateVariant(productId: string, payload: ProductVariantCreateIn) {
  return apiFetch(`/api/admin/products/${productId}/variants`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminUpdateVariant(
  productId: string,
  variantId: string,
  payload: ProductVariantUpdateIn
) {
  return apiFetch(`/api/admin/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminDeleteVariant(productId: string, variantId: string) {
  return apiFetch<void>(`/api/admin/products/${productId}/variants/${variantId}`, {
    method: "DELETE",
    auth: true,
  });
}

/**
 * Image upload needs FormData, not JSON — deliberately bypasses
 * apiFetch, which always sets Content-Type: application/json. Setting
 * Content-Type manually on a FormData request breaks it: the browser
 * needs to set its own multipart boundary string, which it can only
 * do if Content-Type is left unset.
 */
export async function adminUploadProductImage(
  productId: string,
  file: File,
  options: { altText?: string; isPrimary?: boolean } = {}
) {
  const formData = new FormData();
  formData.append("file", file);
  if (options.altText) formData.append("alt_text", options.altText);
  formData.append("is_primary", String(options.isPrimary ?? false));

  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/admin/products/${productId}/images`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ? JSON.stringify(body.detail) : detail;
    } catch {
      // not JSON — keep statusText
    }
    throw new ApiError(res.status, detail);
  }

  return res.json();
}

export function adminDeleteProductImage(productId: string, imageId: string) {
  return apiFetch<void>(`/api/admin/products/${productId}/images/${imageId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function adminListOrders() {
  return apiFetch<AdminOrderListItemOut[]>("/api/admin/orders", { auth: true });
}

export function adminGetOrder(orderNumber: string) {
  return apiFetch<OrderOut>(`/api/admin/orders/${orderNumber}`, { auth: true });
}

export function adminUpdateOrderStatus(orderNumber: string, payload: OrderStatusUpdateIn) {
  return apiFetch<OrderOut>(`/api/admin/orders/${orderNumber}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export { ApiError };
