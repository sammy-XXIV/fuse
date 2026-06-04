import { NextRequest, NextResponse } from "next/server";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { buildMarkDormantTx, buildSettleTx } from "@/lib/contract";
import { suiClient } from "@/lib/tatum";

export async function POST(req: NextRequest) {
  try {
    const { vaultId } = await req.json();
    if (!vaultId) return NextResponse.json({ error: "Missing vaultId" }, { status: 400 });

    const privateKey = process.env.SETTLER_PRIVATE_KEY;
    if (!privateKey) return NextResponse.json({ error: "Settler not configured" }, { status: 500 });

    const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, "hex"));

    // Mark dormant first
    try {
      const dormantTx = buildMarkDormantTx(vaultId);
      await suiClient.signAndExecuteTransaction({ signer: keypair, transaction: dormantTx, options: { showEffects: true } });
    } catch {
      // Already dormant — continue
    }

    // Settle
    const settleTx = buildSettleTx(vaultId);
    const result = await suiClient.signAndExecuteTransaction({
      signer: keypair,
      transaction: settleTx,
      options: { showEffects: true },
    });

    return NextResponse.json({ ok: true, digest: result.digest });
  } catch (e) {
    console.error("Settle error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
