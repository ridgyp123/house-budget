import Link from "next/link";
import { getProjectSummary } from "@/lib/budget";
import { db } from "@/db";
import { receipts, receiptAllocations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function BudgetBar({ budget, committed }: { budget: number; committed: number }) {
  const pct = budget > 0 ? Math.min(100, (committed / budget) * 100) : 0;
  const over = committed > budget;
  return (
    <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
      <div
        className={`h-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
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
  const pendingByReceipt = pendingReceiptIds.map((rid) => ({
    receipt: receiptById.get(rid),
    count: pendingAllocations.filter((a) => a.receiptId === rid).length,
  }));

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold mb-1">688 West 1420 North — Build Budget</h1>
        <p className="text-sm text-neutral-500 mb-4">Pleasant Grove, UT · Lot 18, Makin Dreams Sub</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-neutral-500">Total Budget</div>
            <div className="text-2xl font-semibold">{money(summary.budgetAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Committed</div>
            <div className="text-2xl font-semibold">{money(summary.committed)}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">{summary.remaining >= 0 ? "Remaining" : "Over Budget"}</div>
            <div className={`text-2xl font-semibold ${summary.remaining < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {money(Math.abs(summary.remaining))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <BudgetBar budget={summary.budgetAmount} committed={summary.committed} />
        </div>
        {summary.remaining > 0 && (
          <p className="mt-3 text-sm text-emerald-700">
            You&rsquo;re tracking under budget — there&rsquo;s {money(summary.remaining)} of headroom if you want to upgrade something elsewhere.
          </p>
        )}
      </section>

      {pendingByReceipt.length > 0 && (
        <section className="rounded-xl border bg-amber-50 border-amber-200 p-6">
          <h2 className="font-semibold mb-3">Pending Review ({pendingAllocations.length} line items)</h2>
          <ul className="space-y-2 text-sm">
            {pendingByReceipt.map(({ receipt, count }) =>
              receipt ? (
                <li key={receipt.id} className="flex justify-between">
                  <span>
                    {receipt.vendor ?? receipt.fileName} — {count} item{count > 1 ? "s" : ""}
                  </span>
                  <Link href={`/upload?review=${receipt.id}`} className="text-blue-600 underline">
                    Review
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold mb-4">Categories</h2>
        <div className="space-y-6">
          {summary.categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-medium">{cat.name}</h3>
                <span className="text-sm text-neutral-500">
                  {money(cat.committed)} / {money(cat.budgetAmount)}
                </span>
              </div>
              <BudgetBar budget={cat.budgetAmount} committed={cat.committed} />
              <details className="mt-2">
                <summary className="text-xs text-neutral-500 cursor-pointer">
                  {cat.lineItems.length} line items
                </summary>
                <table className="w-full text-sm mt-2">
                  <tbody>
                    {cat.lineItems.map((li) => (
                      <tr key={li.id} className="border-t">
                        <td className="py-1">{li.name}</td>
                        <td className="py-1 text-right text-neutral-500">{money(li.budgetAmount)}</td>
                        <td className="py-1 text-right">{money(li.committed)}</td>
                        <td
                          className={`py-1 text-right font-medium ${
                            li.remaining < 0 ? "text-red-600" : "text-neutral-700"
                          }`}
                        >
                          {money(li.remaining)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
