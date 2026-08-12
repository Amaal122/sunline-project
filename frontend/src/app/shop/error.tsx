"use client";

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
      <p style={{ marginBottom: 16 }}>Something went wrong loading products.</p>
      <button className="btn btn-dark" onClick={reset}>Try Again</button>
    </div>
  );
}
