"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyOrders } from "@/lib/api";
import { useAppState } from "@/context/AppStateContext";
import { OrderListItemOut } from "@/types/order";
import StatusBadge from "@/components/ui/StatusBadge";

export default function MyOrdersPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppState();

  const [orders, setOrders] = useState<OrderListItemOut[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth guard — redirect unauthenticated users to login
  useEffect(() => {
    // Give AppStateContext one tick to hydrate from localStorage
    const timer = setTimeout(() => {
      if (!isLoggedIn) {
        router.replace("/login?next=/account/orders");
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isLoggedIn, router]);

  // Fetch order history once we know the user is logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    getMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const fmtPrice = (v: string) => `${Number(v).toFixed(2)} DT`;

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading || !isLoggedIn) {
    return (
      <div className="wrap" style={{ paddingTop: 60, paddingBottom: 100 }}>
        <nav style={{ marginBottom: 32, fontSize: 12, color: "var(--ink-dim)" }}>
          <Link href="/account">Account</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>My Orders</span>
        </nav>
        <h1 style={{ marginBottom: 36 }}>My Orders</h1>
        <div style={{ display: "grid", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 72,
                background: "var(--gray)",
                borderRadius: "var(--radius)",
                opacity: 0.6 - i * 0.1,
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (orders && orders.length === 0) {
    return (
      <div className="wrap" style={{ paddingTop: 60, paddingBottom: 100 }}>
        <nav style={{ marginBottom: 32, fontSize: 12, color: "var(--ink-dim)" }}>
          <Link href="/account">Account</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>My Orders</span>
        </nav>
        <h1 style={{ marginBottom: 36 }}>My Orders</h1>
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ color: "var(--ink-dim)", marginBottom: 24, fontSize: 15 }}>
            You haven&apos;t placed any orders yet.
          </p>
          <Link href="/shop" className="btn btn-dark">
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  // ── Order list ───────────────────────────────────────────────────────────
  return (
    <div className="wrap" style={{ paddingTop: 60, paddingBottom: 100 }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: 32, fontSize: 12, color: "var(--ink-dim)" }}>
        <Link href="/account">Account</Link>
        <span style={{ margin: "0 8px" }}>›</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>My Orders</span>
      </nav>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <h1>My Orders</h1>
        <span style={{ color: "var(--ink-dim)", fontSize: 13 }}>
          {orders?.length} order{orders?.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table header (desktop) */}
      <div
        aria-hidden
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr auto auto auto",
          gap: 16,
          padding: "0 20px 12px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-dim)",
          borderBottom: "2px solid var(--ink-faint)",
          marginBottom: 8,
        }}
      >
        <span>Order #</span>
        <span>Items</span>
        <span>Total</span>
        <span>Status</span>
        <span>Payment</span>
      </div>

      {/* Rows */}
      <div style={{ display: "grid", gap: 4 }}>
        {orders?.map((order) => (
          <Link
            key={order.id}
            href={`/order/${order.order_number}`}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr auto auto auto",
              gap: 16,
              padding: "16px 20px",
              borderRadius: "var(--radius)",
              alignItems: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--gray)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span
              style={{ fontWeight: 700, fontSize: 13.5, fontFamily: "var(--font-inter)" }}
            >
              {order.order_number}
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>
              {order.item_count} item{order.item_count !== 1 ? "s" : ""}
            </span>
            <span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap" }}>
              {fmtPrice(order.total)}
            </span>
            <StatusBadge type="order" value={order.status} />
            <StatusBadge type="payment" value={order.payment_status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
