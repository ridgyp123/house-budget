import { NextResponse } from "next/server";
import { db } from "@/db";
import { receiptAllocations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeVerdict } from "@/lib/budget";

export async function POST(_req: Request, ctx: RouteContext<"/api/receipts/[id]/confirm-all">) {
  const { id } = await ctx.params;
  const pending = await db
    .select()
    .from(receiptAllocations)
    .where(
      and(eq(receiptAllocations.receiptId, Number(id)), eq(receiptAllocations.status, "pending_review"))
    );

  const confirmed = [];
  const skipped = [];
  for (const alloc of pending) {
    if (alloc.lineItemId == null) {
      skipped.push(alloc.id);
      continue;
    }
    const verdict = await computeVerdict(alloc.lineItemId, Number(alloc.amount));
    const [row] = await db
      .update(receiptAllocations)
      .set({ status: "confirmed", verdict })
      .where(eq(receiptAllocations.id, alloc.id))
      .returning();
    confirmed.push(row);
  }

  return NextResponse.json({ confirmed, skipped });
}
