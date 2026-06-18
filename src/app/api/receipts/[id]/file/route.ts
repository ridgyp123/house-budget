import { get } from "@vercel/blob";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, ctx: RouteContext<"/api/receipts/[id]/file">) {
  const { id } = await ctx.params;
  const [receipt] = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, Number(id)));

  if (!receipt) {
    return new Response("Not found", { status: 404 });
  }

  const result = await get(receipt.fileUrl, { access: "private" });
  if (!result?.stream) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${receipt.fileName}"`,
    },
  });
}
