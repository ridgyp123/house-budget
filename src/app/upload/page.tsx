"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Verdict = {
  recommendation: "go" | "over_budget" | "review";
  message: string;
  lineItem: { budgetAmount: number; committedBefore: number; quoteAmount: number; remainingAfter: number };
  category: { name: string; budgetAmount: number; committedBefore: number; remainingAfter: number };
  project: { budgetAmount: number; committedBefore: number; remainingAfter: number };
};

type Allocation = {
  id: number;
  receiptId: number;
  lineItemId: number | null;
  description: string | null;
  amount: string;
  status: string;
  verdict: Verdict | null;
};

type Receipt = {
  id: number;
  vendor: string | null;
  totalAmount: string | null;
  docType: string | null;
  fileName: string;
  date: string | null;
};

type CategoryOption = { id: number; name: string; lineItems: { id: number; name: string }[] };

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const VERDICT_STYLE = {
  go: { bg: "#E8F5F5", border: "rgba(0,184,184,.2)", text: "#007070", icon: "#009090" },
  review: { bg: "#FFF8E8", border: "rgba(196,123,0,.2)", text: "#92600A", icon: "#C47B00" },
  over_budget: { bg: "#FFF0EF", border: "rgba(217,48,42,.2)", text: "#B02020", icon: "#D9302A" },
};

const BADGE_STYLE = {
  confirmed: { text: "#1C9A46", bg: "#EEFBF2", border: "rgba(28,154,70,.15)", label: "✓ Confirmed" },
  rejected: { text: "#6B6B65", bg: "#F0EFE9", border: "rgba(107,107,101,.15)", label: "Rejected" },
  go: { text: "#009090", bg: "#E8F5F5", border: "rgba(0,144,144,.15)", label: "✓ Go ahead" },
  review: { text: "#C47B00", bg: "#FFF8E8", border: "rgba(196,123,0,.15)", label: "Needs Review" },
  over_budget: { text: "#D9302A", bg: "#FFF0EF", border: "rgba(217,48,42,.15)", label: "Over Budget" },
  unmatched: { text: "#A8A8A0", bg: "#F0EFE9", border: "rgba(168,168,160,.2)", label: "Needs match" },
};

function VerdictIcon({ type }: { type: keyof typeof VERDICT_STYLE }) {
  const color = VERDICT_STYLE[type].icon;
  if (type === "go") {
    return (
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}>
        <polyline points="10 3 4.5 8.5 2 6" />
      </svg>
    );
  }
  if (type === "review") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}>
        <path d="M8 2L1 14h14z" />
        <path d="M8 6v3M8 11h.01" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6 6l4 4M10 6l-4 4" />
    </svg>
  );
}

function StepCircle({ state, n, label }: { state: "done" | "active" | "future"; n: number; label: string }) {
  const bg = state === "done" ? "#1C9A46" : state === "active" ? "#009090" : "#F0EFE9";
  const textColor = state === "done" ? "#1C9A46" : state === "active" ? "#009090" : "#A8A8A0";
  return (
    <div className="flex items-center gap-1.5">
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: bg,
          border: state === "future" ? "1.5px solid #DDDDD0" : undefined,
        }}
        className="flex items-center justify-center flex-none"
      >
        {state === "done" ? (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="10 3 4.5 8.5 2 6" />
          </svg>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: state === "active" ? "#FFF" : "#A8A8A0" }}>{n}</span>
        )}
      </div>
      <span style={{ fontSize: 13, fontWeight: state === "future" ? 400 : 500, color: textColor }}>{label}</span>
    </div>
  );
}

function StepIndicator({ step }: { step: "upload" | "review" | "done" }) {
  const uploadState = step === "upload" ? "active" : "done";
  const reviewState = step === "upload" ? "future" : step === "review" ? "active" : "done";
  const doneState = step === "done" ? "active" : "future";
  return (
    <div className="flex items-center" style={{ marginBottom: 24 }}>
      <StepCircle state={uploadState} n={1} label="Upload" />
      <div style={{ width: 36, height: 1, background: "#ECEAE4", margin: "0 8px" }} />
      <StepCircle state={reviewState} n={2} label="Review" />
      <div style={{ width: 36, height: 1, background: "#ECEAE4", margin: "0 8px" }} />
      <StepCircle state={doneState} n={3} label="Done" />
    </div>
  );
}

function FieldBox({
  label,
  flex,
  editable,
  children,
}: {
  label: string;
  flex: number;
  editable: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex,
        background: "#F5F4EF",
        border: editable ? "1.5px solid #ECEAE4" : "1.5px solid transparent",
        borderRadius: 8,
        padding: "9px 12px",
      }}
    >
      <div style={{ fontSize: 10, color: "#A8A8A0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function AllocationRow({
  allocation,
  categories,
  onUpdated,
}: {
  allocation: Allocation;
  categories: CategoryOption[];
  onUpdated: (a: Allocation) => void;
}) {
  const [lineItemId, setLineItemId] = useState<number | "">(allocation.lineItemId ?? "");
  const [amount, setAmount] = useState(allocation.amount);
  const [verdict, setVerdict] = useState<Verdict | null>(allocation.verdict);
  const [busy, setBusy] = useState(false);

  async function recalc(nextLineItemId: number | "", nextAmount: string) {
    if (nextLineItemId === "" || !nextAmount) {
      setVerdict(null);
      return;
    }
    const res = await fetch("/api/verdict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineItemId: nextLineItemId, amount: Number(nextAmount) }),
    });
    const data = await res.json();
    setVerdict(data.verdict);
  }

  async function patch(status?: "confirmed" | "rejected" | "pending_review") {
    setBusy(true);
    try {
      const res = await fetch(`/api/allocations/${allocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          lineItemId: lineItemId === "" ? undefined : lineItemId,
          amount: amount ? Number(amount) : undefined,
        }),
      });
      const data = await res.json();
      onUpdated(data.allocation);
    } finally {
      setBusy(false);
    }
  }

  const isFinal = allocation.status === "confirmed" || allocation.status === "rejected";

  const badge =
    allocation.status === "confirmed"
      ? BADGE_STYLE.confirmed
      : allocation.status === "rejected"
      ? BADGE_STYLE.rejected
      : verdict
      ? BADGE_STYLE[verdict.recommendation]
      : BADGE_STYLE.unmatched;

  const borderColor =
    allocation.status === "confirmed"
      ? "#1C9A46"
      : allocation.status === "rejected"
      ? "#ECEAE4"
      : verdict
      ? { go: "#00B8B8", review: "#C47B00", over_budget: "#D9302A" }[verdict.recommendation]
      : "#ECEAE4";

  return (
    <div
      style={{
        background: "#FFF",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: "0 1px 3px rgba(0,0,0,.04)",
        opacity: isFinal ? 0.55 : 1,
      }}
    >
      <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{allocation.description}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "3px 10px",
            borderRadius: 9999,
            background: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
            whiteSpace: "nowrap",
          }}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex gap-2.5" style={{ marginBottom: 10 }}>
        <FieldBox label="Amount" flex={1} editable={!isFinal}>
          <input
            type="number"
            disabled={isFinal}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              recalc(lineItemId, e.target.value);
            }}
            style={{
              fontSize: 14,
              color: isFinal ? "#6B6B65" : "#1A1A18",
              background: "transparent",
              border: "none",
              outline: "none",
              width: "100%",
            }}
          />
        </FieldBox>
        <FieldBox label="Budget line item" flex={2} editable={!isFinal}>
          <select
            disabled={isFinal}
            value={lineItemId}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : "";
              setLineItemId(v);
              recalc(v, amount);
            }}
            style={{
              fontSize: 14,
              color: isFinal ? "#6B6B65" : "#1A1A18",
              background: "transparent",
              border: "none",
              outline: "none",
              width: "100%",
            }}
          >
            <option value="">— Select —</option>
            {categories.map((cat) => (
              <optgroup key={cat.id} label={cat.name}>
                {cat.lineItems.map((li) => (
                  <option key={li.id} value={li.id}>
                    {li.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </FieldBox>
      </div>

      {verdict && !isFinal && (
        <div
          className="flex gap-2"
          style={{
            background: VERDICT_STYLE[verdict.recommendation].bg,
            border: `1px solid ${VERDICT_STYLE[verdict.recommendation].border}`,
            borderRadius: 8,
            padding: "10px 13px",
            marginBottom: 12,
          }}
        >
          <VerdictIcon type={verdict.recommendation} />
          <span style={{ fontSize: 12, color: VERDICT_STYLE[verdict.recommendation].text, lineHeight: 1.5 }}>
            {verdict.message}
          </span>
        </div>
      )}

      {!isFinal ? (
        <div className="flex gap-2">
          <button
            onClick={() => patch("confirmed")}
            disabled={busy || lineItemId === "" || !amount}
            style={{
              background: "#00B8B8",
              color: "#FFF",
              border: "none",
              borderRadius: 9999,
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 600,
              opacity: busy || lineItemId === "" || !amount ? 0.4 : 1,
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => patch("rejected")}
            disabled={busy}
            style={{
              background: "transparent",
              color: "#1A1A18",
              border: "1.5px solid #DDDDD0",
              borderRadius: 9999,
              padding: "9px 20px",
              fontSize: 13,
            }}
          >
            Reject
          </button>
        </div>
      ) : (
        <button
          onClick={() => patch("pending_review")}
          disabled={busy}
          style={{
            background: "transparent",
            color: "#1A1A18",
            border: "1.5px solid #DDDDD0",
            borderRadius: 9999,
            padding: "9px 20px",
            fontSize: 13,
          }}
        >
          Undo — reopen for edit
        </button>
      )}
    </div>
  );
}

function UploadPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const reviewId = params.get("review");

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/line-items")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories));
  }, []);

  useEffect(() => {
    if (!reviewId) return;
    fetch(`/api/receipts/${reviewId}`)
      .then((r) => r.json())
      .then((d) => {
        setReceipt(d.receipt);
        setAllocations(d.allocations);
      });
  }, [reviewId]);

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/receipts/extract", { method: "POST", body: form });
      if (!res.ok) throw new Error("Extraction failed");
      const data = await res.json();
      setReceipt(data.receipt);
      setAllocations(data.allocations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function updateAllocation(updated: Allocation) {
    setAllocations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  const pendingCount = allocations.filter((a) => a.status === "pending_review").length;
  const matchedPendingCount = allocations.filter(
    (a) => a.status === "pending_review" && a.lineItemId != null
  ).length;

  async function confirmAll() {
    if (!receipt) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/receipts/${receipt.id}/confirm-all`, { method: "POST" });
      const data = await res.json();
      const confirmedIds = new Set(data.confirmed.map((a: Allocation) => a.id));
      setAllocations((prev) =>
        prev.map((a) => (confirmedIds.has(a.id) ? data.confirmed.find((c: Allocation) => c.id === a.id) : a))
      );
    } finally {
      setLoading(false);
    }
  }

  const step: "upload" | "review" | "done" = !receipt ? "upload" : pendingCount === 0 ? "done" : "review";
  const vendorLabel = receipt?.vendor ?? receipt?.fileName ?? "";
  const vendorInitial = vendorLabel.trim().charAt(0).toUpperCase() || "?";
  const total = allocations.reduce((s, a) => s + Number(a.amount), 0);

  return (
    <div className="flex flex-col" style={{ maxWidth: 720 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#009090",
          marginBottom: 6,
        }}
      >
        UPLOAD &amp; REVIEW
      </div>
      <div className="font-serif" style={{ fontSize: 30, color: "#1A1A18", marginBottom: 20 }}>
        {!receipt ? "Upload a document" : "Review invoice"}
      </div>

      <StepIndicator step={step} />

      {!receipt && (
        <label
          style={{
            background: "#FFF",
            borderRadius: 16,
            border: "2px dashed #ECEAE4",
            padding: 64,
          }}
          className="flex flex-col items-center gap-3 cursor-pointer"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A8A8A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 16l-4-4-4 4" />
            <path d="M12 12v9" />
            <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
          </svg>
          <span style={{ fontSize: 15, color: "#6B6B65" }}>
            {loading ? "Reading document…" : "Drop a PDF or photo here"}
          </span>
          {!loading && <span style={{ fontSize: 13, color: "#A8A8A0" }}>or click to browse</span>}
          {!loading && <span style={{ fontSize: 11, color: "#A8A8A0" }}>PDF · JPG · PNG</span>}
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
        </label>
      )}

      {error && <p style={{ color: "#D9302A", fontSize: 14 }}>{error}</p>}

      {receipt && (
        <div className="flex flex-col">
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: "18px 22px",
              marginBottom: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            }}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div
                style={{ width: 42, height: 42, borderRadius: "50%", background: "#E8F5F5" }}
                className="flex items-center justify-center flex-none"
              >
                <span className="font-serif" style={{ fontSize: 18, color: "#009090" }}>
                  {vendorInitial}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", marginBottom: 3 }}>
                  {vendorLabel}
                </div>
                <div style={{ fontSize: 13, color: "#6B6B65" }}>
                  {receipt.docType ?? "Document"} · {receipt.date ?? "—"} · {allocations.length} line item
                  {allocations.length > 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flex: "none" }}>
              <div className="font-serif" style={{ fontSize: 28, color: "#1A1A18", marginBottom: 8 }}>
                {money(total)}
              </div>
              {pendingCount > 0 && matchedPendingCount > 1 && (
                <button
                  onClick={confirmAll}
                  disabled={loading}
                  style={{
                    background: "#00B8B8",
                    color: "#FFF",
                    border: "none",
                    borderRadius: 9999,
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  Confirm all matched ({matchedPendingCount})
                </button>
              )}
            </div>
          </div>

          {allocations.map((a) => (
            <AllocationRow key={a.id} allocation={a} categories={categories} onUpdated={updateAllocation} />
          ))}

          {pendingCount === 0 && (
            <button
              onClick={() => router.push("/")}
              style={{
                background: "#00B8B8",
                color: "#FFF",
                border: "none",
                borderRadius: 9999,
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 600,
                marginTop: 8,
                alignSelf: "flex-start",
              }}
            >
              Back to dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadPageInner />
    </Suspense>
  );
}
