"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, ApiError } from "@/lib/api";
import { useAppState } from "@/context/AppStateContext";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const { refreshAuth, refreshCart, refreshWishlist } = useAppState();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ email, password });
      await refreshAuth();
      await refreshCart();
      await refreshWishlist();
      router.push(next); // sends them back to whatever page triggered the login
      router.refresh(); // re-runs Server Components so any server-fetched data updates too
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Incorrect email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap auth-wrap">
      <div className="center-txt" style={{ marginBottom: 30 }}>
        <span className="eyebrow">Welcome to SUNLINE</span>
        <h1 style={{ marginTop: 8 }}>Sign In</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <div className="form-field">
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p style={{ color: "#b00020", fontSize: 13, marginBottom: 14 }}>{error}</p>}
        <button className="btn btn-dark btn-block" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
