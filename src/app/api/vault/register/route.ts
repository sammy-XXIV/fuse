import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

// Store the claim URL for a vault so the cron can email it after settlement
export async function POST(req: NextRequest) {
  const { vaultId, claimUrl } = await req.json();
  if (!vaultId || !claimUrl) {
    return NextResponse.json({ error: "Missing vaultId or claimUrl" }, { status: 400 });
  }
  // TTL: 1 year in seconds
  await kv.set(`claim:${vaultId}`, claimUrl, { ex: 60 * 60 * 24 * 365 });
  return NextResponse.json({ ok: true });
}
