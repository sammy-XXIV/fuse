import { NextRequest, NextResponse } from "next/server";
import { verifyGuardianToken, emailToKeypair } from "@/lib/guardian";
import { buildGuardianConfirmTx } from "@/lib/contract";
import { suiClient } from "@/lib/tatum";

export async function POST(req: NextRequest) {
  try {
    const { email, vaultId, token } = await req.json();

    if (!email || !vaultId || !token) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!verifyGuardianToken(email, vaultId, token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const keypair = emailToKeypair(email);
    const tx = buildGuardianConfirmTx(vaultId);

    const result = await suiClient.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    return NextResponse.json({ ok: true, digest: result.digest });
  } catch (e) {
    console.error("Guardian confirm error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
