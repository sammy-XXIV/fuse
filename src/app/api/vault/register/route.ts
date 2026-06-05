import { setClaimUrl } from "@/lib/gist-store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { vaultId, claimUrl } = await req.json();
  if (!vaultId || !claimUrl) {
    return NextResponse.json({ error: "Missing vaultId or claimUrl" }, { status: 400 });
  }
  await setClaimUrl(vaultId, claimUrl);
  return NextResponse.json({ ok: true });
}
