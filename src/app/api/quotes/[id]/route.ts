import { NextResponse } from "next/server";
import { db } from "@/db";
import { lineItemQuotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(lineItemQuotes).where(eq(lineItemQuotes.id, Number(id)));
  return NextResponse.json({ ok: true });
}
