"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/context/AppStateContext";
import { ShoppingBag, Heart, LogOut } from "lucide-react";

export default function AccountPage() {
  const { user, isLoggedIn, logout } = useAppState();
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoggedIn) router.replace("/login?next=/account");
    }, 200);
    return () => clearTimeout(timer);
  }, [isLoggedIn, router]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (!isLoggedIn) {
    return (
      <div className="wrap" style={{ paddingTop: 80, paddingBottom: 80, textAlign: "center" }}>
        <p style={{ color: "var(--ink-dim)" }}>Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 60, paddingBottom: 100 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 48 }}>
        <p className="eyebrow" style={{ color: "var(--lavender)", marginBottom: 10 }}>
          My Account
        </p>
        <h1>Hello, {user?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
        <p style={{ color: "var(--ink-dim)", marginTop: 10, fontSize: 15 }}>
          {user?.email}
        </p>
      </div>

      {/* Action cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
          marginBottom: 48,
        }}
      >
        <AccountCard
          href="/account/orders"
          icon={<ShoppingBag size={22} strokeWidth={1.6} />}
          title="My Orders"
          description="Track and review your order history"
        />
        <AccountCard
          href="/wishlist"
          icon={<Heart size={22} strokeWidth={1.6} />}
          title="Wishlist"
          description="Items you've saved for later"
        />
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="btn btn-outline"
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <LogOut size={15} />
        Log Out
      </button>
    </div>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────
function AccountCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 18,
        padding: "24px",
        border: "1px solid var(--ink-faint)",
        borderRadius: "var(--radius)",
        transition: "all 0.25s var(--ease)",
        background: "var(--ivory)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--ink)";
        (e.currentTarget as HTMLElement).style.background = "var(--gray)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-faint)";
        (e.currentTarget as HTMLElement).style.background = "var(--ivory)";
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--radius)",
          background: "var(--gray)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "var(--lavender)",
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>{description}</div>
      </div>
    </Link>
  );
}
