"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminListOrders, ApiError } from "@/lib/api";
import { AdminOrderListItemOut } from "@/types/admin";

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--gray)",
  processing: "var(--lavender)",
  shipped: "var(--lavender)",
  delivered: "#c9e4c5",
  cancelled: "#f2c9c9",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderListItemOut[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminListOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load orders"));
  }, []);

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!orders) return <p>Loading…</p>;

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--ink-faint)", textAlign: "left" }}>
            <th style={{ padding: "10px 8px" }}>Order #</th>
            <th style={{ padding: "10px 8px" }}>Customer</th>
            <th style={{ padding: "10px 8px" }}>Items</th>
            <th style={{ padding: "10px 8px" }}>Total</th>
            <th style={{ padding: "10px 8px" }}>Status</th>
            <th style={{ padding: "10px 8px" }}>Payment</th>
            <th style={{ padding: "10px 8px" }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ borderBottom: "1px solid var(--ink-faint)" }}>
              <td style={{ padding: "10px 8px" }}>
                <Link href={`/admin/orders/${o.order_number}`} style={{ textDecoration: "underline" }}>
                  #{o.order_number}
                </Link>
              </td>
              <td style={{ padding: "10px 8px" }}>{o.full_name}</td>
              <td style={{ padding: "10px 8px" }}>{o.item_count}</td>
              <td style={{ padding: "10px 8px" }}>{o.total} DT</td>
              <td style={{ padding: "10px 8px" }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: STATUS_COLORS[o.status] }}>
                  {o.status}
                </span>
              </td>
              <td style={{ padding: "10px 8px" }}>{o.payment_status}</td>
              <td style={{ padding: "10px 8px" }}>{new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p style={{ padding: 20, color: "var(--ink-dim)" }}>No orders yet.</p>}
    </div>
  );
}
