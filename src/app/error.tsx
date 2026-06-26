"use client";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h2 style={{ color: "#D9302A", marginBottom: 12 }}>Page error</h2>
      <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, overflow: "auto", fontSize: 13 }}>
        {error.message}
        {error.digest ? `\ndigest: ${error.digest}` : ""}
      </pre>
    </div>
  );
}
