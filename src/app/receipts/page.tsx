import Link from "next/link";
import { db } from "@/db";
import { receipts, receiptAllocations, lineItems } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function statusBadge(status: string) {
  if (status === "confirmed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-neutral-100 text-neutral-500 border-neutral-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default async function ReceiptsPage() {
  const allReceipts = await db.select().from(receipts).orderBy(desc(receipts.createdAt));
  const allAllocations = await db.select().from(receiptAllocations);
  const allLineItems = await db.select().from(lineItems);
  const lineItemById = new Map(allLineItems.map((li) => [li.id, li]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Receipts &amp; Invoices</h1>

      {allReceipts.length === 0 && (
        <p className="text-sm text-neutral-500">
          Nothing uploaded yet. <Link href="/upload" className="text-blue-600 underline">Upload a quote or receipt</Link>.
        </p>
      )}

      <div className="space-y-4">
        {allReceipts.map((r) => {
          const allocations = allAllocations.filter((a) => a.receiptId === r.id);
          const total = allocations.reduce((s, a) => s + Number(a.amount), 0);
          return (
            <div key={r.id} className="rounded-xl border bg-white p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium">{r.vendor ?? r.fileName}</div>
                  <div className="text-xs text-neutral-500">
                    {r.date ?? new Date(r.createdAt).toLocaleDateString()} · {r.docType ?? "document"} ·{" "}
                    {allocations.length} line item{allocations.length > 1 ? "s" : ""} · {money(total)} total
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <a
                    href={`/api/receipts/${r.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View original
                  </a>
                  <Link href={`/upload?review=${r.id}`} className="text-blue-600 underline">
                    Edit
                  </Link>
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="py-1.5">{a.description}</td>
                      <td className="py-1.5 text-neutral-500">
                        {a.lineItemId != null ? lineItemById.get(a.lineItemId)?.name ?? "—" : "Unmatched"}
                      </td>
                      <td className="py-1.5 text-right">{money(Number(a.amount))}</td>
                      <td className="py-1.5 text-right">
                        <span className={`text-xs rounded border px-2 py-0.5 ${statusBadge(a.status)}`}>
                          {a.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
