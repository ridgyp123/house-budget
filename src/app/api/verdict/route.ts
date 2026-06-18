import { NextResponse } from "next/server";
import { computeVerdict } from "@/lib/budget";

export async function POST(req: Request) {
  const { lineItemId, amount } = await req.json();
  if (typeof lineItemId !== "number" || typeof amount !== "number") {
    return NextResponse.json({ error: "lineItemId and amount required" }, { status: 400 });
  }
  const verdict = await computeVerdict(lineItemId, amount);
  return NextResponse.json({ verdict });
}
