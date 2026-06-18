import { NextResponse } from "next/server";
import { db } from "@/db";
import { receiptAllocations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeVerdict } from "@/lib/budget";

export async function PATCH(req: Request, ctx: RouteContext<"/api/allocations/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { status, lineItemId, amount } = body as {
    status?: "confirmed" | "rejected";
    lineItemId?: number;
    amount?: number;
  };

  const [existing] = await db
    .select()
    .from(receiptAllocations)
    .where(eq(receiptAllocations.id, Number(id)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Partial<typeof receiptAllocations.$inferInsert> = {};
  if (lineItemId !== undefined) updates.lineItemId = lineItemId;
  if (amount !== undefined) updates.amount = amount.toFixed(2);

  if (status === "confirmed") {
    const finalLineItemId = lineItemId ?? existing.lineItemId;
    const finalAmount = amount ?? Number(existing.amount);
    if (finalLineItemId == null) {
      return NextResponse.json({ error: "lineItemId is required to confirm" }, { status: 400 });
    }
    updates.verdict = await computeVerdict(finalLineItemId, finalAmount);
    updates.status = "confirmed";
  } else if (status === "rejected") {
    updates.status = "rejected";
  }

  const [row] = await db
    .update(receiptAllocations)
    .set(updates)
    .where(eq(receiptAllocations.id, Number(id)))
    .returning();

  return NextResponse.json({ allocation: row });
}
