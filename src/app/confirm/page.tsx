"use client";
import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectButton } from "@mysten/dapp-kit";
import { fetchVault, buildGuardianConfirmTx } from "@/lib/contract";

interface VaultInfo {
  id: string;
  conditionLabel: string;
  guardians: string[];
  guardianThreshold: number;
  guardianConfirms: number;
  state: number;
}

export default function ConfirmPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [vaultId, setVaultId] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"email" | "wallet">("email");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const load = useCallback(async (vid: string) => {
    try {
      const raw = await fetchVault(vid) as Record<string, unknown> | null;
      if (!raw) { setError("Vault not found. Use the exact link from your email."); setLoading(false); return; }
      setVault({
        id: raw.id as string,
        conditionLabel: (raw.condition_label as string) || "Guardian confirmation vault",
        guardians: (raw.guardians as string[]) ?? [],
        guardianThreshold: Number(raw.guardian_threshold ?? 1),
        guardianConfirms: Array.isArray(raw.guardian_confirms)
          ? raw.guardian_confirms.length
          : (typeof raw.guardian_confirms === "string" ? 0 : Number(raw.guardian_confirms ?? 0)),
        state: Number(raw.state ?? 0),
      });
    } catch {
      setError("Failed to load vault. Use the exact link from your email.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get("vault") ?? "";
    const em = params.get("email") ?? "";
    const tok = params.get("token") ?? "";

    setVaultId(vid);
    setEmail(em);
    setToken(tok);
    if (!em) setMode("wallet");

    if (!vid || !vid.startsWith("0x")) {
      setError("Invalid vault link. Use the exact link from your email.");
      setLoading(false);
      return;
    }
    load(vid);
  }, [load]);

  async function handleEmailConfirm() {
    setConfirming(true);
    setError("");
    try {
      const res = await fetch("/api/guardian/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, vaultId, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Confirmation failed");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setConfirming(false);
    }
  }

  async function handleWalletConfirm() {
    if (!vault || !account) return;
    setConfirming(true);
    setError("");
    try {
      const tx = buildGuardianConfirmTx(vault.id);
      await signAndExecute({ transaction: tx });
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      if (msg.includes("abort code: 1") || msg.includes("ENotAlive")) {
        // Vault already went dormant from enough votes — treat as success
        setDone(true);
      } else {
        setError(msg);
      }
    } finally {
      setConfirming(false);
    }
  }

  const isGuardian = vault && account
    ? vault.guardians.map(g => g.toLowerCase()).includes(account.address.toLowerCase())
    : false;

  const alreadySettled = vault && vault.state >= 2;
  const hasToken = !!token && !!email;
  const W = "rgba(120,240,212,";

  return (
    <div className="max-w-lg mx-auto px-4 md:px-6 pt-16 md:pt-20 pb-16">
      <div className="text-center mb-10">
        <div className="text-5xl mb-5">📬</div>
        <h1 className="text-4xl font-bold mb-3">
          Release <span style={{ color: "var(--walrus)" }}>Files</span>
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Vote to release the files. Once enough votes are cast, delivery is automatic.
        </p>
      </div>

      <div className="glass-card p-4 md:p-8">

        {loading && (
          <div className="text-center py-10" style={{ color: "var(--muted)" }}>
            <p>Loading vault...</p>
          </div>
        )}

        {!loading && error && !done && (
          <div className="text-center py-10">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
          </div>
        )}

        {!loading && vault && (
          <div>
            {/* Vault info */}
            <div
              className="p-5 rounded-xl mb-6"
              style={{ background: `${W}0.04)`, border: `1px solid ${W}0.15)` }}
            >
              <div className="text-xs font-semibold mb-3" style={{ color: "var(--walrus)" }}>Vault Details</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>Confirmations</span>
                  <span className="font-medium" style={{ color: "var(--walrus)" }}>
                    {vault.guardianConfirms} / {vault.guardianThreshold} required
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>Status</span>
                  <span className="font-medium" style={{ color: alreadySettled ? "var(--walrus)" : "#f59e0b" }}>
                    {alreadySettled ? "Settled" : "Awaiting confirmations"}
                  </span>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (vault.guardianConfirms / vault.guardianThreshold) * 100)}%`,
                    background: "var(--walrus)",
                  }}
                />
              </div>
            </div>

            {done ? (
              <div className="p-5 rounded-xl text-center" style={{ background: `${W}0.06)`, border: `1px solid ${W}0.25)` }}>
                <div className="text-3xl mb-3">✅</div>
                <div className="font-semibold mb-1" style={{ color: "var(--walrus)" }}>Vote recorded</div>
                <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
                  The threshold has been reached. Enter your email below and the download link will be sent to you automatically once the vault settles (within a minute).
                </p>
                {subscribed ? (
                  <div className="text-sm" style={{ color: "var(--walrus)" }}>📧 You&apos;ll receive the files at {deliveryEmail}</div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      className="glass-input flex-1"
                      placeholder="your@email.com"
                      value={deliveryEmail}
                      onChange={e => setDeliveryEmail(e.target.value)}
                    />
                    <button
                      className="btn-primary shrink-0"
                      style={{ padding: "10px 18px", fontSize: "13px" }}
                      disabled={subscribing || !deliveryEmail.includes("@")}
                      onClick={async () => {
                        setSubscribing(true);
                        await fetch("/api/guardian/subscribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ vaultId, email: deliveryEmail }),
                        });
                        setSubscribed(true);
                        setSubscribing(false);
                      }}
                    >
                      {subscribing ? "..." : "Notify me"}
                    </button>
                  </div>
                )}
              </div>
            ) : alreadySettled ? (
              <div className="p-4 rounded-xl text-sm text-center" style={{ background: `${W}0.06)`, border: `1px solid ${W}0.2)`, color: "var(--walrus)" }}>
                This vault has already settled — files have been delivered.
              </div>
            ) : (
              <div>
                {/* Mode toggle */}
                <div className="toggle-group mb-5">
                  <button className={`toggle-tab ${mode === "email" ? "active" : ""}`} onClick={() => setMode("email")}>
                    📧 Via Email Link
                  </button>
                  <button className={`toggle-tab ${mode === "wallet" ? "active" : ""}`} onClick={() => setMode("wallet")}>
                    👛 Via Wallet
                  </button>
                </div>

                <div className="p-4 rounded-xl mb-5 text-sm" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                  ⚠️ Your vote is permanent and recorded on-chain. Once the threshold is reached, files are delivered automatically.
                </div>

                {mode === "email" ? (
                  hasToken ? (
                    <div>
                      <p className="text-xs mb-4 text-center" style={{ color: "var(--muted)" }}>
                        Confirming as <span style={{ color: "var(--walrus)" }}>{email}</span>
                      </p>
                      {error && <p className="text-sm mb-3 text-center" style={{ color: "#f87171" }}>{error}</p>}
                      <button className="btn-primary w-full" style={{ padding: "14px" }} disabled={confirming} onClick={handleEmailConfirm}>
                        {confirming ? "Submitting..." : "✅ Vote to release files"}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl text-sm text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                      Use the exact link from the email you received as a guardian.
                    </div>
                  )
                ) : (
                  !account ? (
                    <div className="text-center">
                      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Connect your Sui wallet to confirm.</p>
                      <ConnectButton />
                    </div>
                  ) : !isGuardian ? (
                    <div className="p-4 rounded-xl text-sm text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                      Your wallet ({account.address.slice(0, 10)}…) is not listed as a guardian for this vault.
                    </div>
                  ) : (
                    <div>
                      {error && <p className="text-sm mb-3 text-center" style={{ color: "#f87171" }}>{error}</p>}
                      <button className="btn-primary w-full" style={{ padding: "14px" }} disabled={confirming} onClick={handleWalletConfirm}>
                        {confirming ? "Signing..." : "✅ Vote to release files"}
                      </button>
                      <p className="text-xs mt-3 text-center" style={{ color: "var(--walrus)" }}>✓ Wallet verified as guardian</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
