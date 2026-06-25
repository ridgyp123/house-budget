"use client";

import { useState } from "react";
import { categoryStatus, STATUS_COLORS } from "@/lib/budget";
import type { CategorySummary } from "@/lib/budget";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="#A8A8A0"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
    >
      <circle cx="6.5" cy="6.5" r="4.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  );
}

function CategoryCard({
  cat,
  isOpen,
  onToggle,
  highlightQuery,
}: {
  cat: CategorySummary;
  isOpen: boolean;
  onToggle: () => void;
  highlightQuery: string;
}) {
  const status = categoryStatus(cat.committed, cat.budgetAmount);
  const colors = STATUS_COLORS[status];
  const pct = cat.budgetAmount > 0 ? Math.min(100, (cat.committed / cat.budgetAmount) * 100) : 0;

  return (
    <div style={{ background: "#FFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
      <div style={{ padding: 16, cursor: "pointer" }} onClick={onToggle}>
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
        <div style={{ height: 5, background: "#F0EFE9", borderRadius: 9999, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: colors.bar, borderRadius: 9999 }} />
        </div>
        <div style={{ fontSize: 12, color: "#6B6B65" }}>
          {money(cat.committed)} <span style={{ color: "#A8A8A0" }}>/ {money(cat.budgetAmount)}</span>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "0 16px 14px" }}>
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <td />
                {(["Budget", "Spent", "Left"] as const).map((h) => (
                  <td
                    key={h}
                    style={{
                      textAlign: "right",
                      color: "#A8A8A0",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      paddingBottom: 4,
                    }}
                  >
                    {h}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {cat.lineItems.map((li) => {
                const over = li.remaining < 0;
                const leftColor = over ? "#D9302A" : li.committed > 0 ? "#1C9A46" : "#A8A8A0";
                const isMatch = highlightQuery && li.name.toLowerCase().includes(highlightQuery);
                return (
                  <tr
                    key={li.id}
                    style={{
                      borderTop: "1px solid #F0EFE9",
                      background: isMatch ? "#F0FAFA" : undefined,
                    }}
                  >
                    <td style={{ padding: "5px 4px 5px 0", color: "#1A1A18" }}>{li.name}</td>
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
                    <td colSpan={3} style={{ padding: "6px 0 0", fontSize: 11, color: "#6B6B65" }}>
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
      )}
    </div>
  );
}

export function DashboardCategories({ categories }: { categories: CategorySummary[] }) {
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const q = search.trim().toLowerCase();
  const isSearching = q.length > 0;

  const visible = categories
    .map((cat) => ({
      ...cat,
      lineItems: isSearching ? cat.lineItems.filter((li) => li.name.toLowerCase().includes(q)) : cat.lineItems,
    }))
    .filter((cat) => !isSearching || cat.lineItems.length > 0);

  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <SearchIcon />
        <input
          type="text"
          placeholder="Search line items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px 10px 40px",
            borderRadius: 10,
            border: "1px solid #E0DFD9",
            background: "#FFF",
            fontSize: 14,
            color: "#1A1A18",
            outline: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,.05)",
            boxSizing: "border-box",
          }}
        />
        {isSearching && (
          <button
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#A8A8A0",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {isSearching && visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#A8A8A0", fontSize: 14 }}>
          No line items match &ldquo;{search}&rdquo;
        </div>
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
        style={{ marginBottom: 8, alignItems: "start" }}
      >
        {visible.map((cat) => {
          const isOpen = isSearching || openIds.has(cat.id);
          return (
            <div
              key={cat.id}
              style={{ gridColumn: isOpen ? "1 / -1" : undefined }}
            >
              <CategoryCard
                cat={cat}
                isOpen={isOpen}
                onToggle={() => toggle(cat.id)}
                highlightQuery={isSearching ? q : ""}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
