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
};

type CategoryOption = { id: number; name: string; lineItems: { id: number; name: string }[] };

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function recommendationStyle(r: Verdict["recommendation"]) {
  if (r === "go") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (r === "review") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function recommendationLabel(r: Verdict["recommendation"]) {
  if (r === "go") return "Go ahead";
  if (r === "review") return "Needs a look";
  return "Over budget";
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

  const isFinal = allocation.status !== "pending_review";

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${isFinal ? "opacity-60" : ""}`}>
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium">{allocation.description}</span>
        {isFinal && (
          <span className="text-xs uppercase tracking-wide text-neutral-500">{allocation.status}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Amount
          <input
            type="number"
            disabled={isFinal}
            className="border rounded px-2 py-1 text-sm"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              recalc(lineItemId, e.target.value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Matched budget line item
          <select
            disabled={isFinal}
            className="border rounded px-2 py-1 text-sm"
            value={lineItemId}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : "";
              setLineItemId(v);
              recalc(v, amount);
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
        </label>
      </div>

      {verdict && (
        <div className={`rounded border p-2 text-xs ${recommendationStyle(verdict.recommendation)}`}>
          <span className="font-semibold">{recommendationLabel(verdict.recommendation)}: </span>
          {verdict.message}
        </div>
      )}

      {!isFinal ? (
        <div className="flex gap-2">
          <button
            onClick={() => patch("confirmed")}
            disabled={busy || lineItemId === "" || !amount}
            className="rounded bg-neutral-900 text-white px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Confirm
          </button>
          <button
            onClick={() => patch("rejected")}
            disabled={busy}
            className="rounded border px-3 py-1.5 text-xs"
          >
            Reject
          </button>
        </div>
      ) : (
        <button
          onClick={() => patch("pending_review")}
          disabled={busy}
          className="rounded border px-3 py-1.5 text-xs"
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

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <h1 className="text-xl font-semibold">Upload Quote, Receipt, or Invoice</h1>

      {!receipt && (
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-white p-12 text-center cursor-pointer hover:border-neutral-400">
          <span className="text-sm text-neutral-500">
            {loading ? "Reading document…" : "Click to choose a PDF or photo — single charge or multi-line invoice, both work"}
          </span>
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

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {receipt && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4 flex justify-between items-center">
            <div>
              <div className="font-medium">{receipt.vendor ?? receipt.fileName}</div>
              <div className="text-sm text-neutral-500">
                {allocations.length} line item{allocations.length > 1 ? "s" : ""} ·{" "}
                {receipt.totalAmount ? money(Number(receipt.totalAmount)) : ""} total
              </div>
            </div>
            {pendingCount > 0 && matchedPendingCount > 1 && (
              <button
                onClick={confirmAll}
                disabled={loading}
                className="rounded bg-neutral-900 text-white px-4 py-2 text-sm disabled:opacity-40"
              >
                Confirm all matched ({matchedPendingCount})
              </button>
            )}
          </div>

          <div className="space-y-3">
            {allocations.map((a) => (
              <AllocationRow key={a.id} allocation={a} categories={categories} onUpdated={updateAllocation} />
            ))}
          </div>

          {pendingCount === 0 && (
            <button onClick={() => router.push("/")} className="rounded border px-4 py-2 text-sm">
              Done — back to dashboard
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
