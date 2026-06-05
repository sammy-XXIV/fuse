import { NextRequest, NextResponse } from "next/server";
import { SuiJsonRpcClient, JsonRpcHTTPTransport } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getClaimUrl, getSubscribers } from "@/lib/gist-store";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const MODULE = "fuse";
const RPC = "https://fullnode.testnet.sui.io:443";

const client = new SuiJsonRpcClient({
  network: "testnet",
  transport: new JsonRpcHTTPTransport({ url: RPC }),
});

// Derive a keypair from the deployer private key stored in env
function getKeypair(): Ed25519Keypair {
  const raw = process.env.SETTLER_PRIVATE_KEY!;
  return Ed25519Keypair.fromSecretKey(Buffer.from(raw, "hex"));
}

async function fetchAllVaultIds(): Promise<string[]> {
  const res = await client.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::${MODULE}::VaultCreated` },
    limit: 50,
  });
  return res.data.map((e) => (e.parsedJson as { vault_id: string }).vault_id);
}

async function getVaultState(id: string): Promise<{ state: number; conditionType: number; deadlineMs: number } | null> {
  const obj = await client.getObject({ id, options: { showContent: true } });
  if (obj.data?.content?.dataType !== "moveObject") return null;
  const f = (obj.data.content as { fields: Record<string, unknown> }).fields;
  const condType = Number(f.condition_type ?? 0);
  const intervalMs = Number(f.interval_ms ?? 0);
  const lastCheckin = Number(f.last_checkin_ms ?? 0);
  const fireDateMs = Number(f.fire_date_ms ?? 0);
  const deadlineMs = condType === 1 ? fireDateMs : lastCheckin + intervalMs;
  return { state: Number(f.state ?? 0), conditionType: condType, deadlineMs };
}

async function callTx(fn: "mark_dormant" | "settle", vaultId: string) {
  const kp = getKeypair();
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::${fn}`,
    arguments: [tx.object(vaultId), tx.object("0x6")],
  });
  await client.signAndExecuteTransaction({
    signer: kp,
    transaction: tx,
    options: { showEffects: true },
  });
}

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron (or our secret)
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SETTLER_PRIVATE_KEY) {
    return NextResponse.json({ error: "SETTLER_PRIVATE_KEY not set" }, { status: 500 });
  }

  const now = Date.now();
  const settled: string[] = [];
  const errors: string[] = [];

  try {
    const ids = await fetchAllVaultIds();

    for (const id of ids) {
      try {
        const info = await getVaultState(id);
        if (!info) continue;
        if (info.state >= 2) continue; // already settled, skip

        if (info.state === 0) {
          // Alive — check if deadline passed, then mark dormant
          if (now < info.deadlineMs) continue;
          await callTx("mark_dormant", id);
        }

        // State is now 1 (dormant) — settle it
        await callTx("settle", id);
        settled.push(id);

        // Email any subscribers who registered on the confirm page
        try {
          const claimUrl = await getClaimUrl(id);
          const subscribers = await getSubscribers(id);
          if (claimUrl && subscribers.length > 0) {
            const RESEND_API_KEY = process.env.RESEND_API_KEY!;
            await Promise.all(subscribers.map(email =>
              fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: "Fuse <noreply@fusevault.xyz>",
                  to: [email],
                  subject: "Your files are ready — Fuse",
                  html: `<div style="font-family:sans-serif;background:#070D1B;color:#F8FAFF;padding:40px;border-radius:16px;">
                    <h2 style="color:#78F0D4;">⚡ Files are ready</h2>
                    <p>The vault has settled. Click below to access your files.</p>
                    <a href="${claimUrl}" style="display:inline-block;background:#78F0D4;color:#060D1A;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;margin:16px 0;">Access My Files →</a>
                    <p style="font-size:12px;color:#4A5B7A;word-break:break-all;">${claimUrl}</p>
                  </div>`,
                }),
              })
            ));
          }
        } catch (emailErr) {
          errors.push(`${id} email: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`);
        }
      } catch (e) {
        errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ settled, errors, checkedAt: new Date().toISOString() });
}
