import Link from "next/link";
import { getProjectSummary, categoryStatus, STATUS_COLORS } from "@/lib/budget";
import { db } from "@/db";
import { receipts, receiptAllocations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function money(n: number, opts: Intl.NumberFormatOptions = {}) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, ...opts });
}

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: boolean;
  sub?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFF",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        borderTop: accent ? "3px solid #00B8B8" : undefined,
      }}
      className="flex-1"
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#A8A8A0",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div className="font-serif" style={{ fontSize: 34, color: accent ? "#009090" : "#1A1A18", lineHeight: 1 }}>
        {value}
      </div>
      {sub}
    </div>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 3 4.5 8.5 2 6" />
    </svg>
  );
}

export default async function Home() {
  const summary = await getProjectSummary();
  const pendingAllocations = await db
    .select()
    .from(receiptAllocations)
    .where(eq(receiptAllocations.status, "pending_review"));
  const pendingReceiptIds = [...new Set(pendingAllocations.map((a) => a.receiptId))];
  const allReceipts = pendingReceiptIds.length > 0 ? await db.select().from(receipts) : [];
  const receiptById = new Map(allReceipts.map((r) => [r.id, r]));
  const pendingByReceipt = pendingReceiptIds
    .map((rid) => ({
      receipt: receiptById.get(rid),
      count: pendingAllocations.filter((a) => a.receiptId === rid).length,
    }))
    .filter((p) => p.receipt);

  const pctCommitted = summary.budgetAmount > 0 ? (summary.committed / summary.budgetAmount) * 100 : 0;
  const reviewHref =
    pendingByReceipt.length === 1 ? `/upload?review=${pendingByReceipt[0].receipt!.id}` : "/receipts";

  return (
    <div className="flex flex-col">
      <div style={{ marginBottom: 20 }}>
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
        <div className="font-serif" style={{ fontSize: 24, color: "#1A1A18" }}>
          688 West 1420 North
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3" style={{ marginBottom: 16 }}>
        <StatCard label="Total Budget" value={money(summary.budgetAmount)} />
        <StatCard label="Committed" value={money(summary.committed)} />
        <StatCard
          label={summary.remaining >= 0 ? "Remaining" : "Over Budget"}
          value={money(Math.abs(summary.remaining))}
          accent={summary.remaining >= 0}
          sub={
            <div className="flex items-center gap-1" style={{ marginTop: 6 }}>
              <CheckIcon color={summary.remaining >= 0 ? "#1C9A46" : "#D9302A"} />
              <span style={{ fontSize: 12, color: summary.remaining >= 0 ? "#1C9A46" : "#D9302A" }}>
                {summary.remaining >= 0 ? "Under budget" : "Over budget"}
              </span>
            </div>
          }
        />
      </div>

      <div
        style={{
          background: "#FFF",
          borderRadius: 12,
          padding: "16px 22px",
          marginBottom: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}
      >
        <div className="flex justify-between" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#A8A8A0" }}>{pctCommitted.toFixed(1)}% committed</span>
          <span style={{ fontSize: 12, color: "#A8A8A0" }}>
            {Math.max(0, 100 - pctCommitted).toFixed(1)}% remaining
          </span>
        </div>
        <div style={{ height: 8, background: "#F0EFE9", borderRadius: 9999, overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(100, pctCommitted)}%`,
              height: "100%",
              background: pctCommitted > 100 ? "#D9302A" : "#00B8B8",
              borderRadius: 9999,
            }}
          />
        </div>
      </div>

      {pendingByReceipt.length > 0 && (
        <div
          style={{
            background: "#FFFBF0",
            border: "1px solid #EDD96A",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 20,
          }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#92600A", marginBottom: 3 }}>
              {pendingAllocations.length} line item{pendingAllocations.length > 1 ? "s" : ""} need review
            </div>
            <div style={{ fontSize: 13, color: "#B88040" }}>
              {pendingByReceipt
                .map((p) => `${p.receipt!.vendor ?? p.receipt!.fileName} · ${p.count} item${p.count > 1 ? "s" : ""}`)
                .join("  ·  ")}
            </div>
          </div>
          <Link
            href={reviewHref}
            style={{
              background: "#C47B00",
              color: "#FFF",
              borderRadius: 9999,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flex: "none",
              textAlign: "center",
            }}
          >
            Review Now
          </Link>
        </div>
      )}

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#A8A8A0",
          marginBottom: 12,
        }}
      >
        Categories
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ marginBottom: 8 }}>
        {summary.categories.map((cat) => {
          const status = categoryStatus(cat.committed, cat.budgetAmount);
          const colors = STATUS_COLORS[status];
          const pct = cat.budgetAmount > 0 ? Math.min(100, (cat.committed / cat.budgetAmount) * 100) : 0;
          return (
            <details
              key={cat.id}
              style={{ background: "#FFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
            >
              <summary style={{ padding: 16, cursor: "pointer", listStyle: "none" }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{cat.name}</div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: 9999,
                      whiteSpace: "nowrap",
                      color: colors.text,
                      background: colors.bg,
                    }}
                  >
                    {status}
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    background: "#F0EFE9",
                    borderRadius: 9999,
                    overflow: "hidden",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ width: `${pct}%`, height: "100%", background: colors.bar, borderRadius: 9999 }} />
                </div>
                <div style={{ fontSize: 12, color: "#6B6B65" }}>
                  {money(cat.committed)} <span style={{ color: "#A8A8A0" }}>/ {money(cat.budgetAmount)}</span>
                </div>
              </summary>
              <div style={{ padding: "0 16px 14px" }}>
                <table className="w-full" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <td />
                      <td
                        style={{
                          textAlign: "right",
                          color: "#A8A8A0",
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          paddingBottom: 4,
                        }}
                      >
                        Budget
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#A8A8A0",
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          paddingBottom: 4,
                        }}
                      >
                        Spent
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#A8A8A0",
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          paddingBottom: 4,
                        }}
                      >
                        Left
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.lineItems.map((li) => {
                      const over = li.remaining < 0;
                      const leftColor = over ? "#D9302A" : li.committed > 0 ? "#1C9A46" : "#A8A8A0";
                      return (
                        <tr key={li.id} style={{ borderTop: "1px solid #F0EFE9" }}>
                          <td style={{ padding: "5px 0", color: "#1A1A18" }}>{li.name}</td>
                          <td style={{ padding: "5px 0", textAlign: "right", color: "#A8A8A0" }}>
                            {money(li.budgetAmount)}
                          </td>
                          <td
                            style={{
                              padding: "5px 0",
                              textAlign: "right",
                              fontWeight: over ? 700 : 500,
                              color: over ? "#D9302A" : "#1A1A18",
                            }}
                          >
                            {money(li.committed)}
                          </td>
                          <td
                            style={{
                              padding: "5px 0",
                              textAlign: "right",
                              fontWeight: over ? 700 : 500,
                              color: leftColor,
                            }}
                          >
                            {over ? `−${money(Math.abs(li.remaining))}` : money(li.remaining)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const catOver = cat.remaining < 0;
                      const catLeftColor = catOver ? "#D9302A" : cat.committed > 0 ? "#1C9A46" : "#A8A8A0";
                      return (
                        <tr style={{ borderTop: "2px solid #1A1A18" }}>
                          <td style={{ padding: "7px 0", fontWeight: 700, color: "#1A1A18" }}>Total</td>
                          <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: "#1A1A18" }}>
                            {money(cat.budgetAmount)}
                          </td>
                          <td
                            style={{
                              padding: "7px 0",
                              textAlign: "right",
                              fontWeight: 700,
                              color: catOver ? "#D9302A" : "#1A1A18",
                            }}
                          >
                            {money(cat.committed)}
                          </td>
                          <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: catLeftColor }}>
                            {catOver ? `−${money(Math.abs(cat.remaining))}` : money(cat.remaining)}
                          </td>
                        </tr>
                      );
                    })()}
                    {(() => {
                      const executed = cat.lineItems.filter((li) => li.committed > 0);
                      if (executed.length === 0) return null;
                      const realized = executed.reduce((s, li) => s + (li.budgetAmount - li.committed), 0);
                      const positive = realized >= 0;
                      return (
                        <tr>
                          <td
                            colSpan={3}
                            style={{ padding: "6px 0 0", fontSize: 11, color: "#6B6B65" }}
                          >
                            Surplus/deficit on {executed.length} executed item{executed.length > 1 ? "s" : ""} —
                            reallocatable if positive
                          </td>
                          <td
                            style={{
                              padding: "6px 0 0",
                              textAlign: "right",
                              fontSize: 13,
                              fontWeight: 700,
                              color: positive ? "#1C9A46" : "#D9302A",
                            }}
                          >
                            {positive ? "+" : "−"}
                            {money(Math.abs(realized))}
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
