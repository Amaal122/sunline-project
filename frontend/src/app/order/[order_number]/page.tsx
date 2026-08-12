"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { getOrderByNumber as fetchOrder, getAccessToken, ApiError } from "@/lib/api";
import StatusBadge from "@/components/ui/StatusBadge";
import { OrderOut } from "@/types/order";

export default function OrderConfirmationPage() {
  const params = useParams<{ order_number: string }>();
  const [order, setOrder] = useState<OrderOut | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.order_number) return;

    // Build the fetch manually so we can attach the auth token when present
    // (required for logged-in user orders; harmless for guest orders)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${apiUrl}/api/orders/${params.order_number}`, {
      headers,
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          setNotFoundState(true);
          return;
        }
        const data = await res.json();
        setOrder(data);
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [params.order_number]);

  const fmtPrice = (v: string) => `${Number(v).toFixed(2)} DT`;

  if (loading) {
    return (
      <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
        <p style={{ color: "var(--ink-dim)" }}>Loading your order…</p>
      </div>
    );
  }

  if (notFoundState || !order) {
    return (
      <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
        <h1 style={{ marginBottom: 16 }}>Order Not Found</h1>
        <p style={{ color: "var(--ink-dim)", marginBottom: 28 }}>
          We couldn&apos;t find that order. Double-check the order number and try again.
        </p>
        <Link href="/shop" className="btn btn-dark">
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "60px 0 100px" }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        {/* Checkmark circle */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ivory)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="eyebrow" style={{ color: "var(--lavender)", marginBottom: 10 }}>
          Order Confirmed
        </p>
        <h1 style={{ marginBottom: 10 }}>Thank you!</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 15 }}>
          Your order{" "}
          <strong style={{ color: "var(--ink)" }}>{order.order_number}</strong>{" "}
          has been placed.
        </p>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 52,
          alignItems: "start",
        }}
      >
        {/* LEFT — items + totals */}
        <div>
          {/* Order items */}
          <section style={{ marginBottom: 36 }}>
            <p
              className="eyebrow"
              style={{
                marginBottom: 16,
                borderBottom: "1px solid var(--ink-faint)",
                paddingBottom: 10,
              }}
            >
              Items Ordered
            </p>

            <div>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--ink-faint)",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 3 }}>
                      {item.color} / {item.size} — qty {item.quantity} ×{" "}
                      {fmtPrice(item.unit_price)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, textAlign: "right" }}>
                    {fmtPrice(item.line_total)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Totals */}
          <div
            style={{
              background: "var(--gray)",
              borderRadius: "var(--radius)",
              padding: "20px 24px",
            }}
          >
            <PriceRow label="Subtotal" value={fmtPrice(order.subtotal)} />
            <PriceRow
              label="Delivery"
              value={
                Number(order.delivery_fee) === 0
                  ? "Free"
                  : fmtPrice(order.delivery_fee)
              }
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: 16,
                borderTop: "1px solid var(--ink-faint)",
                paddingTop: 14,
                marginTop: 10,
              }}
            >
              <span>Total</span>
              <span>{fmtPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — delivery + status */}
        <div style={{ display: "grid", gap: 24 }}>
          {/* Delivery details */}
          <div
            style={{
              border: "1px solid var(--ink-faint)",
              borderRadius: "var(--radius)",
              padding: "22px 24px",
            }}
          >
            <p className="eyebrow" style={{ marginBottom: 16 }}>
              Delivery Address
            </p>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{order.full_name}</p>
            <p style={{ color: "var(--ink-dim)", fontSize: 13.5, lineHeight: 1.7 }}>
              {order.address_line}
              <br />
              {order.city}, {order.governorate} {order.postal_code}
            </p>
            <p style={{ color: "var(--ink-dim)", fontSize: 13.5, marginTop: 8 }}>
              📞 {order.phone}
            </p>
          </div>

          {/* Status card */}
          <div
            style={{
              border: "1px solid var(--ink-faint)",
              borderRadius: "var(--radius)",
              padding: "22px 24px",
            }}
          >
            <p className="eyebrow" style={{ marginBottom: 16 }}>
              Order Status
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>Order</span>
                <StatusBadge type="order" value={order.status} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>Payment</span>
                <StatusBadge type="payment" value={order.payment_status} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>Method</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {order.payment_method === "COD" ? "Cash on Delivery" : "Online"}
                </span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: "grid", gap: 12 }}>
            <Link
              href="/shop"
              className="btn btn-dark btn-block"
              style={{ textAlign: "center" }}
            >
              Continue Shopping
            </Link>
            <Link
              href="/account/orders"
              className="btn btn-outline btn-block"
              style={{ textAlign: "center" }}
            >
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 10,
        fontSize: 13.5,
      }}
    >
      <span style={{ color: "var(--ink-dim)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
