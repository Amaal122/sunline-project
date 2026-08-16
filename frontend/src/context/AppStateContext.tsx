"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getAccessToken, getCart, getWishlist, getMe, logout as apiLogout } from "@/lib/api";
import { UserOut } from "@/types/auth";

interface AppState {
  user: UserOut | null;
  cartCount: number;
  wishlistIds: string[];
  isLoggedIn: boolean;
  authChecked: boolean;
  refreshAuth: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  const refreshAuth = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    // No token gate here on purpose — guest carts are real and
    // identified via the httpOnly cookie the backend sets, not a
    // login token. Only wishlist genuinely requires being logged in.
    try {
      const cart = await getCart();
      setCartCount(cart.count);
    } catch {
      setCartCount(0);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    if (!getAccessToken()) {
      setWishlistIds([]);
      return;
    }
    try {
      const wishlist = await getWishlist();
      setWishlistIds(wishlist.product_ids);
    } catch {
      setWishlistIds([]);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setCartCount(0);
    setWishlistIds([]);
  }, []);

  // On first mount, hydrate everything if a token already exists
  // (e.g. person refreshed the page while logged in).
  useEffect(() => {
    refreshAuth().finally(() => setAuthChecked(true));
    refreshCart();
    refreshWishlist();
  }, [refreshAuth, refreshCart, refreshWishlist]);

  return (
    <AppStateContext.Provider
      value={{
        user,
        cartCount,
        wishlistIds,
        isLoggedIn: !!user,
        authChecked,
        refreshAuth,
        refreshCart,
        refreshWishlist,
        logout,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
