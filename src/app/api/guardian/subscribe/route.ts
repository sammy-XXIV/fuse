import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

// Register an email to receive the claim link when a vault settles
export async function POST(req: NextRequest) {
  const { vaultId, email } = await req.json();
  if (!vaultId || !email || !email.includes("@")) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  await kv.sadd(`subscribers:${vaultId}`, email);
  return NextResponse.json({ ok: true });
}
