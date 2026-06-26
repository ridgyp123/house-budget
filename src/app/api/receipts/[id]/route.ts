import { NextResponse } from "next/server";
import { db } from "@/db";
import { receipts, receiptAllocations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [receipt] = await db.select().from(receipts).where(eq(receipts.id, Number(id)));
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allocations = await db
    .select()
    .from(receiptAllocations)
    .where(eq(receiptAllocations.receiptId, Number(id)));
  return NextResponse.json({ receipt, allocations });
}
