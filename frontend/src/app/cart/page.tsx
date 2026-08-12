
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCart, updateCartItem, removeCartItem, ApiError } from "@/lib/api";
import { CartOut } from "@/types/cart";
import { useAppState } from "@/context/AppStateContext";

export default function CartPage() {
  const { refreshCart } = useAppState();
  const [cart, setCart] = useState<CartOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getCart();
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(variantId: string, quantity: number) {
    try {
      const next = await updateCartItem(variantId, { quantity });
      setCart(next);
      await refreshCart();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemove(variantId: string) {
    try {
      const next = await removeCartItem(variantId);
      setCart(next);
      await refreshCart();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>Loading your bag…</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="wrap" style={{ padding: "100px 0", textAlign: "center" }}>
        <h1>Your Bag</h1>
        <p style={{ margin: "16px 0 30px", color: "var(--ink-dim)" }}>
          Your bag is empty.
        </p>
        <Link href="/shop" className="btn btn-dark">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "40px 0 100px" }}>
      <h1 style={{ marginBottom: 30 }}>Your Bag</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 60 }}>
        <div>
          {cart.items.map((item) => (
            <div
              key={item.product_variant_id}
              style={{
                display: "grid",
                gridTemplateColumns: "96px 1fr auto",
                gap: 18,
                padding: "22px 0",
                borderBottom: "1px solid var(--ink-faint)",
                alignItems: "center",
              }}
            >
              <Link href={`/product/${item.product.slug}`}>
                {item.product.primary_image ? (
                  <img
                    src={item.product.primary_image.url}
                    alt={item.product.primary_image.alt_text ?? item.product.name}
                    style={{ width: 96, aspectRatio: "3/4", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: 96, aspectRatio: "3/4", background: "var(--gray)" }} />
                )}
              </Link>

              <div>
                <Link href={`/product/${item.product.slug}`} style={{ fontWeight: 500 }}>
                  {item.product.name}
                </Link>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", margin: "4px 0 10px" }}>
                  {item.variant.color} / {item.variant.size}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => handleUpdate(item.product_variant_id, item.quantity - 1)}>
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleUpdate(item.product_variant_id, item.quantity + 1)}>
                    +
                  </button>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>{item.line_total} DT</div>
                <button
                  className="remove-link"
                  onClick={() => handleRemove(item.product_variant_id)}
                  style={{ fontSize: 11.5, textDecoration: "underline", color: "var(--ink-dim)" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--gray)", padding: 28, borderRadius: 2, height: "fit-content" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span>Subtotal</span>
            <span>{cart.subtotal} DT</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span>Delivery</span>
            <span>{Number(cart.delivery_fee) === 0 ? "Free" : `${cart.delivery_fee} DT`}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: 16,
              borderTop: "1px solid var(--ink-faint)",
              paddingTop: 16,
              marginTop: 6,
            }}
          >
            <span>Total</span>
            <span>{cart.total} DT</span>
          </div>
          <Link href="/checkout" className="btn btn-dark btn-block" style={{ marginTop: 20, display: "block", textAlign: "center" }}>
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
