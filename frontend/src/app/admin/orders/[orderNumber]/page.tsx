"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetOrder, adminUpdateOrderStatus, ApiError } from "@/lib/api";
import { OrderOut, OrderItemOut } from "@/types/order";
import { OrderStatus, PaymentStatus } from "@/types/admin";

const STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "paid", "failed", "refunded"];

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderOut | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  function load() {
    adminGetOrder(params.orderNumber)
      .then(setOrder)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load order"));
  }

  useEffect(load, [params.orderNumber]);

  async function updateStatus(field: "status" | "payment_status", value: string) {
    setUpdating(true);
    try {
      const updated = await adminUpdateOrderStatus(params.orderNumber, { [field]: value });
      setOrder(updated);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!order) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <button onClick={() => router.push("/admin/orders")} style={{ marginBottom: 20, fontSize: 13, textDecoration: "underline" }}>
        ← Back to Orders
      </button>

      <h2 style={{ marginBottom: 4 }}>Order #{order.order_number}</h2>
      <p style={{ color: "var(--ink-dim)", marginBottom: 24 }}>{order.full_name} · {order.phone}</p>

      <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>Order Status</label>
          <select value={order.status} disabled={updating} onChange={(e) => updateStatus("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>Payment Status</label>
          <select value={order.payment_status} disabled={updating} onChange={(e) => updateStatus("payment_status", e.target.value)}>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <h3 className="mini-title" style={{ marginBottom: 12 }}>Shipping</h3>
      <div style={{ background: "var(--gray)", padding: 16, marginBottom: 30, fontSize: 13.5 }}>
        <p>{order.address_line}</p>
        <p>{order.city}, {order.governorate} {order.postal_code}</p>
      </div>

      <h3 className="mini-title" style={{ marginBottom: 12 }}>Items</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 20 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--ink-faint)", textAlign: "left" }}>
            <th style={{ padding: 8 }}>Product</th>
            <th style={{ padding: 8 }}>Color / Size</th>
            <th style={{ padding: 8 }}>Qty</th>
            <th style={{ padding: 8 }}>Unit Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item: OrderItemOut) => (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--ink-faint)" }}>
              <td style={{ padding: 8 }}>{item.product_name}</td>
              <td style={{ padding: 8 }}>{item.color} / {item.size}</td>
              <td style={{ padding: 8 }}>{item.quantity}</td>
              <td style={{ padding: 8 }}>{item.unit_price} DT</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: "right", fontSize: 14 }}>
        <p>Subtotal: {order.subtotal} DT</p>
        <p>Delivery: {order.delivery_fee} DT</p>
        <p style={{ fontWeight: 700, fontSize: 16 }}>Total: {order.total} DT</p>
      </div>
    </div>
  );
}
