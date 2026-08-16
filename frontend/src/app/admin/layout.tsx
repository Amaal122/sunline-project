"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "@/context/AppStateContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, authChecked, isLoggedIn } = useAppState();
  const router = useRouter();
  const pathname = usePathname();

  // authChecked distinguishes "still verifying login" from "confirmed
  // not logged in" — without this, a real admin gets bounced for a
  // split second before their session loads, every single time.
  if (!authChecked) {
    return <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>Checking access…</div>;
  }

  if (!isLoggedIn) {
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    return null;
  }

  if (!user?.is_admin) {
    return (
      <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
        <h1>Not Authorized</h1>
        <p style={{ color: "var(--ink-dim)", margin: "14px 0 26px" }}>
          This account doesn&apos;t have admin access.
        </p>
        <Link className="btn btn-dark" href="/">Back to Site</Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "30px 0 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 style={{ fontSize: 28 }}>Admin Dashboard</h1>
        <nav style={{ display: "flex", gap: 20 }}>
          <Link
            href="/admin/products"
            style={{ fontWeight: pathname.startsWith("/admin/products") ? 700 : 400 }}
          >
            Products
          </Link>
          <Link
            href="/admin/orders"
            style={{ fontWeight: pathname.startsWith("/admin/orders") ? 700 : 400 }}
          >
            Orders
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
