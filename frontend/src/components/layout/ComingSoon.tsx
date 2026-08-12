import Link from "next/link";

export default function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="wrap empty-state">
      <h1>{title}</h1>
      <p style={{ color: "var(--ink-dim)", margin: "14px 0 26px" }}>
        This page is being built in {phase}.
      </p>
      <Link className="btn btn-dark" href="/shop">Back to Shop</Link>
    </div>
  );
}
