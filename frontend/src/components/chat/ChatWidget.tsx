"use client";
import { useEffect, useRef, useState } from "react";

// ---- adjust these three ----
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "sunline_access_token";         // the localStorage key where your login token is saved
const ACCENT = "#1f2937";           // your brand color
// -----------------------------

const CONV_KEY = "sunline_conv_id";
const MSGS_KEY = "sunline_chat_msgs";

const STAGES: Record<string, string> = {
  working: "Je vérifie…",
  info: "Je consulte nos informations…",
  orders: "Je consulte vos commandes…",
  escalation: "Je contacte un conseiller…",
};

type Msg = { id: number; role: "user" | "bot"; text: string };

const GREETING: Msg = { id: 0, role: "bot", text: "Bonjour ! Comment puis-je vous aider ?" };

function renderText(text: string) {
  // minimal markdown: **bold** only
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const convId = useRef<string | null>(null);
  const nextId = useRef(1);
  const bottom = useRef<HTMLDivElement>(null);

  // restore the conversation after a page reload (same browser tab)
  useEffect(() => {
    try {
      convId.current = sessionStorage.getItem(CONV_KEY);
      const saved = sessionStorage.getItem(MSGS_KEY);
      if (saved) {
        const parsed: Msg[] = JSON.parse(saved);
        if (parsed.length) {
          setMsgs(parsed);
          nextId.current = Math.max(...parsed.map((m) => m.id)) + 1;
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
    } catch {}
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, status, open]);

  function addMsg(role: Msg["role"], text: string) {
    const id = nextId.current++;
    setMsgs((m) => [...m, { id, role, text }]);
    return id;
  }

  // reveals the validated answer progressively (typewriter effect)
  function typeOut(id: number, full: string) {
    return new Promise<void>((resolve) => {
      const chars = Array.from(full);
      let i = 0;
      const timer = setInterval(() => {
        i = Math.min(chars.length, i + 3);
        const shown = chars.slice(0, i).join("");
        setMsgs((m) => m.map((x) => (x.id === id ? { ...x, text: shown } : x)));
        if (i >= chars.length) {
          clearInterval(timer);
          resolve();
        }
      }, 15);
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setStatus("");
    addMsg("user", text);

    try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) headers.Authorization = `Bearer ${token}`;

      const url = `${API_URL}/api/agent/chat`;
      const body = JSON.stringify({ message: text, conversation_id: convId.current });
      let res = await fetch(url, { method: "POST", headers, body });

      if (res.status === 401 && headers.Authorization) {
        // expired or invalid token: continue as a guest instead of failing
        delete headers.Authorization;
        res = await fetch(url, { method: "POST", headers, body });
      }
      if (res.status === 429) throw new Error("Trop de messages. Réessayez dans une minute.");
      if (!res.ok) throw new Error("Service momentanément indisponible.");

      const result: { reply?: string; conversation_id?: string } = await res.json();
      if (!result.reply || !result.conversation_id) throw new Error("Pas de réponse. Réessayez.");
      convId.current = result.conversation_id;
      sessionStorage.setItem(CONV_KEY, result.conversation_id);
      const id = addMsg("bot", "");
      await typeOut(id, result.reply);
    } catch (e) {
      setStatus("");
      addMsg("bot", e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div style={S.panel} role="dialog" aria-label="Assistant SUNLINE">
          <div style={S.header}>
            <span>Assistant SUNLINE</span>
            <button onClick={() => setOpen(false)} style={S.close} aria-label="Fermer">×</button>
          </div>
          <div style={S.list}>
            {msgs.map((m) => (
              <div key={m.id} style={{ ...S.row, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  dir="auto"
                  style={{ ...S.bubble, ...(m.role === "user" ? S.user : S.bot) }}
                >
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {status && <div style={S.status}>{status}</div>}
            <div ref={bottom} />
          </div>
          <div style={S.inputRow}>
            <input
              dir="auto"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Écrivez votre message…"
              maxLength={1000}
              disabled={busy}
              style={S.input}
            />
            <button onClick={send} disabled={busy || !input.trim()} style={{ ...S.send, opacity: busy || !input.trim() ? 0.5 : 1 }}>
              Envoyer
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} style={S.fab} aria-label="Ouvrir le chat">
        {open ? "×" : "💬"}
      </button>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  fab: { position: "fixed", bottom: 20, right: 20, width: 56, height: 56, borderRadius: "50%", border: "none", background: ACCENT, color: "#fff", fontSize: 24, cursor: "pointer", zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,.25)" },
  panel: { position: "fixed", bottom: 88, right: 20, width: 360, maxWidth: "calc(100vw - 40px)", height: 520, maxHeight: "calc(100vh - 120px)", background: "#fff", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 1000, fontFamily: "system-ui, sans-serif", fontSize: 14, color: "#111" },
  header: { background: ACCENT, color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 600 },
  close: { background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" },
  list: { flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8, background: "#f7f7f8" },
  row: { display: "flex" },
  bubble: { maxWidth: "82%", padding: "8px 12px", borderRadius: 12, whiteSpace: "pre-wrap", lineHeight: 1.4, wordBreak: "break-word" },
  user: { background: ACCENT, color: "#fff", borderBottomRightRadius: 4 },
  bot: { background: "#fff", color: "#111", border: "1px solid #e5e7eb", borderBottomLeftRadius: 4 },
  status: { fontSize: 12, color: "#6b7280", fontStyle: "italic", paddingLeft: 4 },
  inputRow: { display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e5e7eb", background: "#fff" },
  input: { flex: 1, padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none" },
  send: { padding: "0 14px", border: "none", borderRadius: 10, background: ACCENT, color: "#fff", cursor: "pointer", fontSize: 14 },
};