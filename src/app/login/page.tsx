"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Incorrect password.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F4EE",
      }}
    >
      <div
        style={{
          background: "#FFF",
          borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "0 2px 16px rgba(0,0,0,.08)",
          width: "100%",
          maxWidth: 360,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#009090",
            marginBottom: 4,
          }}
        >
          BUILD BUDGET · PLEASANT GROVE, UT
        </div>
        <div
          className="font-serif"
          style={{ fontSize: 22, color: "#1A1A18", marginBottom: 28 }}
        >
          688 West 1420 North
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            style={{
              border: "1px solid #E0DFD8",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 15,
              outline: "none",
              width: "100%",
            }}
          />
          {error && (
            <div style={{ fontSize: 13, color: "#D9302A" }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#009090",
              color: "#FFF",
              border: "none",
              borderRadius: 10,
              padding: "12px",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
