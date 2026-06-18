import { NextResponse } from "next/server";
import { db } from "@/db";
import { receiptAllocations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeVerdict } from "@/lib/budget";

export async function PATCH(req: Request, ctx: RouteContext<"/api/allocations/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { status, lineItemId, amount } = body as {
    status?: "confirmed" | "rejected" | "pending_review";
    lineItemId?: number;
    amount?: number;
  };

  const [existing] = await db
    .select()
    .from(receiptAllocations)
    .where(eq(receiptAllocations.id, Number(id)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fieldUpdates: Partial<typeof receiptAllocations.$inferInsert> = {};
  if (lineItemId !== undefined) fieldUpdates.lineItemId = lineItemId;
  if (amount !== undefined) fieldUpdates.amount = amount.toFixed(2);

  // If this allocation is already confirmed and is being edited, pull its old
  // amount out of the running totals first (by un-confirming) so the verdict
  // recomputed below isn't double-counting this row's own prior contribution.
  if (existing.status === "confirmed" && (lineItemId !== undefined || amount !== undefined)) {
    await db
      .update(receiptAllocations)
      .set({ status: "pending_review" })
      .where(eq(receiptAllocations.id, Number(id)));
  }

  if (Object.keys(fieldUpdates).length > 0) {
    await db.update(receiptAllocations).set(fieldUpdates).where(eq(receiptAllocations.id, Number(id)));
  }

  const finalUpdates: Partial<typeof receiptAllocations.$inferInsert> = {};
  // Editing a confirmed row's amount/match without an explicit status implies
  // "reconfirm with the new values" rather than leaving it stuck pending.
  const effectiveStatus =
    status ?? (existing.status === "confirmed" ? "confirmed" : undefined);

  if (effectiveStatus === "confirmed") {
    const finalLineItemId = lineItemId ?? existing.lineItemId;
    const finalAmount = amount ?? Number(existing.amount);
    if (finalLineItemId == null) {
      return NextResponse.json({ error: "lineItemId is required to confirm" }, { status: 400 });
    }
    finalUpdates.verdict = await computeVerdict(finalLineItemId, finalAmount);
    finalUpdates.status = "confirmed";
  } else if (effectiveStatus === "rejected") {
    finalUpdates.status = "rejected";
  } else if (effectiveStatus === "pending_review") {
    finalUpdates.status = "pending_review";
  }

  const [row] =
    Object.keys(finalUpdates).length > 0
      ? await db
          .update(receiptAllocations)
          .set(finalUpdates)
          .where(eq(receiptAllocations.id, Number(id)))
          .returning()
      : await db.select().from(receiptAllocations).where(eq(receiptAllocations.id, Number(id)));

  return NextResponse.json({ allocation: row });
}
