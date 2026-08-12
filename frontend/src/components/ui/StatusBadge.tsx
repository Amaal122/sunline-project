"use client";

import { OrderStatus, PaymentStatus } from "@/types/order";

// ─── Maps ─────────────────────────────────────────────────────────────────────

type BadgeStyle = { label: string; bg: string; color: string };

const ORDER_STATUS_MAP: Record<OrderStatus, BadgeStyle> = {
  pending: { label: "Pending", bg: "var(--gray)", color: "var(--ink)" },
  processing: { label: "Processing", bg: "var(--lavender-dim)", color: "var(--ink)" },
  shipped: { label: "Shipped", bg: "var(--lavender)", color: "var(--ink)" },
  delivered: { label: "Delivered", bg: "var(--ink)", color: "var(--ivory)" },
  cancelled: { label: "Cancelled", bg: "#e8d5d5", color: "#7a2828" },
};

const PAYMENT_STATUS_MAP: Record<PaymentStatus, BadgeStyle> = {
  unpaid: { label: "Unpaid", bg: "var(--gray)", color: "var(--ink)" },
  paid: { label: "Paid", bg: "var(--ink)", color: "var(--ivory)" },
  failed: { label: "Failed", bg: "#e8d5d5", color: "#7a2828" },
  refunded: { label: "Refunded", bg: "var(--lavender-dim)", color: "var(--ink)" },
};

const FALLBACK: BadgeStyle = { label: "–", bg: "var(--gray)", color: "var(--ink)" };

// ─── Component ────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  type: "order" | "payment";
  value: OrderStatus | PaymentStatus;
}

export default function StatusBadge({ type, value }: StatusBadgeProps) {
  let style: BadgeStyle;
  if (type === "order") {
    style = ORDER_STATUS_MAP[value as OrderStatus] ?? FALLBACK;
  } else {
    style = PAYMENT_STATUS_MAP[value as PaymentStatus] ?? FALLBACK;
  }

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        display: "inline-block",
        borderRadius: "var(--radius)",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        padding: "4px 9px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
}
