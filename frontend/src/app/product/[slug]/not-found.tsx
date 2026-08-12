import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="wrap" style={{ padding: "100px 0", textAlign: "center" }}>
      <h1 style={{ marginBottom: 16 }}>Product Not Found</h1>
      <p style={{ color: "var(--ink-dim)", marginBottom: 26 }}>
        This piece may have sold out permanently or the link is outdated.
      </p>
      <Link href="/shop" className="btn btn-dark">Back to Shop</Link>
    </div>
  );
}
