"use client";
import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const TOKEN_KEY = "sunline_access_token";

type Escalation = {
  id: number;
  created_at: string;
  reason: string | null;
  summary: string | null;
  language: string | null;
  order_number: string | null;
  status: "open" | "done";
};

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export default function EscalationsPage() {
  const [items, setItems] = useState<Escalation[]>([]);
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`${API_URL}/api/agent/admin/escalations${qs}`, {
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403)
        throw new Error("Accès refusé : connectez-vous avec un compte admin sur le site.");
      if (!res.ok) throw new Error("Erreur serveur.");
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(it: Escalation) {
    const next = it.status === "open" ? "done" : "open";
    const res = await fetch(`${API_URL}/api/agent/admin/escalations/${it.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) load();
    else setError("Mise à jour impossible.");
  }

  const ref = (id: number) => `ESC-${String(id).padStart(5, "0")}`;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Support requests</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        Cases handed over by &apos;over to the&apos;team.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        {(["open", "done", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: filter === f ? "#1f2937" : "#fff",
              color: filter === f ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            {f === "open" ? "Open" : f === "done" ? "Done" : "All"}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: "auto", padding: "6px 14px", cursor: "pointer" }}>
          Refresh
        </button>
      </div>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {loading && <p>Loading…</p>}
      {!loading && !error && items.length === 0 && <p>No support requests.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it) => (
          <div
            key={it.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 14,
              background: it.status === "open" ? "#fff" : "#f9fafb",
              opacity: it.status === "done" ? 0.75 : 1,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{ref(it.id)}</strong>
              <span style={{ color: "#6b7280", fontSize: 13 }}>
                {new Date(it.created_at).toLocaleString("fr-FR")}
              </span>
              {it.reason && <span style={{ fontSize: 12, background: "#eef2ff", padding: "2px 8px", borderRadius: 6 }}>{it.reason}</span>}
              {it.language && <span style={{ fontSize: 12, color: "#6b7280" }}>{it.language}</span>}
              {it.order_number && <span style={{ fontSize: 13 }}>Order {it.order_number}</span>}
              <button
                onClick={() => toggle(it)}
                style={{ marginLeft: "auto", padding: "6px 12px", cursor: "pointer", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff" }}
              >
                {it.status === "open" ? " Mark as done" : "Reopen"}
              </button>
            </div>
            <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{it.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}