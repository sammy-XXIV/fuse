"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchVault } from "@/lib/contract";

interface VaultInfo {
  id: string;
  conditionLabel: string;
  guardianThreshold: number;
  guardianConfirms: number;
  state: number;
}

export default function ConfirmPage() {
  const [vaultId, setVaultId] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (vid: string) => {
    try {
      const raw = await fetchVault(vid) as Record<string, unknown> | null;
      if (!raw) { setError("Vault not found. Use the exact link from your email."); setLoading(false); return; }
      setVault({
        id: raw.id as string,
        conditionLabel: (raw.condition_label as string) || "Guardian confirmation vault",
        guardianThreshold: Number(raw.guardian_threshold ?? 1),
        guardianConfirms: Number(raw.guardian_confirms ?? 0),
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

    if (!vid || !vid.startsWith("0x")) {
      setError("Invalid vault link. Use the exact link from your email.");
      setLoading(false);
      return;
    }
    load(vid);
  }, [load]);

  async function handleConfirm() {
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

  const alreadySettled = vault && vault.state >= 2;
  const hasToken = !!token && !!email;
  const W = "rgba(120,240,212,";

  return (
    <div className="max-w-lg mx-auto px-6 pt-20 pb-16">
      <div className="text-center mb-10">
        <div className="text-5xl mb-5">👥</div>
        <h1 className="text-4xl font-bold mb-3">
          Guardian <span style={{ color: "var(--walrus)" }}>Confirm</span>
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Confirm that the vault owner is unreachable to trigger file delivery.
        </p>
      </div>

      <div className="glass-card p-8">

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
                {email && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--muted)" }}>Confirming as</span>
                    <span className="font-medium">{email}</span>
                  </div>
                )}
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
              <div
                className="p-5 rounded-xl text-center"
                style={{ background: `${W}0.06)`, border: `1px solid ${W}0.25)` }}
              >
                <div className="text-3xl mb-3">✅</div>
                <div className="font-semibold mb-1" style={{ color: "var(--walrus)" }}>Confirmed</div>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Your confirmation is recorded on-chain. Once the threshold is reached, files will be delivered automatically.
                </p>
              </div>
            ) : alreadySettled ? (
              <div
                className="p-4 rounded-xl text-sm text-center"
                style={{ background: `${W}0.06)`, border: `1px solid ${W}0.2)`, color: "var(--walrus)" }}
              >
                This vault has already settled — files have been delivered.
              </div>
            ) : !hasToken ? (
              <div
                className="p-4 rounded-xl text-sm text-center"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
              >
                This link is incomplete. Use the exact link from the email you received.
              </div>
            ) : (
              <div>
                <div
                  className="p-4 rounded-xl mb-5 text-sm"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
                >
                  ⚠️ By confirming, you are declaring that you cannot reach the vault owner. This action is permanent and recorded on-chain.
                </div>
                {error && (
                  <p className="text-sm mb-4 text-center" style={{ color: "#f87171" }}>{error}</p>
                )}
                <button
                  className="btn-primary w-full"
                  style={{ padding: "14px" }}
                  disabled={confirming}
                  onClick={handleConfirm}
                >
                  {confirming ? "Submitting..." : "✅ Confirm I can't reach them"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
