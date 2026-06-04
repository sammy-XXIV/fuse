"use client";
import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { fetchVaultsByOwner, buildCheckInTx, buildSettleTx, COND } from "@/lib/contract";
import ScrollReveal from "@/components/ScrollReveal";
import { registerSW, requestNotificationPermission, checkVaultNotifications } from "@/lib/notifications";

type VaultStatus = "alive" | "dormant" | "settled_revealed" | "settled_burned";

interface VaultUI {
  id: string;
  label: string;
  heirContact: string;
  delivery: string;
  rule: "reveal" | "burn";
  status: VaultStatus;
  deadlineMs: number;
  intervalMs: number;
  conditionType: number;
  conditionLabel: string;
}

function msToDeadline(deadlineMs: number) {
  const diff = Math.max(0, deadlineMs - Date.now());
  const s = Math.floor(diff / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function stateToStatus(state: number, rule: number): VaultStatus {
  if (state === 0) return "alive";
  if (state === 1) return "dormant";
  if (state === 2) return "settled_revealed";
  return rule === 1 ? "settled_burned" : "settled_revealed";
}

function mapRawVault(raw: Record<string, unknown>): VaultUI {
  const state = Number(raw.state ?? 0);
  const rule = Number(raw.rule ?? 0);
  const intervalMs = Number(raw.interval_ms ?? 0);
  const lastCheckin = Number(raw.last_checkin_ms ?? Date.now());
  const fireDateMs = Number(raw.fire_date_ms ?? 0);
  const condType = Number(raw.condition_type ?? 0);

  const deadlineMs = condType === 1 ? fireDateMs : lastCheckin + intervalMs;

  const condLabels: Record<number, string> = { 0: "Ping Timeout", 1: "Date Lock", 2: "Guardian Confirm", 3: "Wallet Trigger", 4: "Combined" };

  return {
    id: raw.id as string,
    label: condLabels[condType] || "Vault",
    heirContact: (raw.heir_contact as string) || (raw.heir as string) || "—",
    delivery: (raw.delivery_method as string) || "wallet",
    rule: rule === 1 ? "burn" : "reveal",
    status: stateToStatus(state, rule),
    deadlineMs,
    intervalMs,
    conditionType: condType,
    conditionLabel: (raw.condition_label as string) || "",
  };
}

function Countdown({ vault }: { vault: VaultUI }) {
  const [time, setTime] = useState(msToDeadline(vault.deadlineMs));

  useEffect(() => {
    if (vault.status !== "alive") return;
    const id = setInterval(() => setTime(msToDeadline(vault.deadlineMs)), 1000);
    return () => clearInterval(id);
  }, [vault.status, vault.deadlineMs]);

  if (vault.status !== "alive") {
    return (
      <div className="text-center py-2">
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Vault is {vault.status.replace("_", " ")}
        </div>
      </div>
    );
  }

  const totalMs = vault.intervalMs || 1;
  const remaining = Math.max(0, vault.deadlineMs - Date.now());
  const pct = Math.min(100, ((totalMs - remaining) / totalMs) * 100);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 justify-center">
        {[
          { v: time.d, l: "days" },
          { v: time.h, l: "hrs" },
          { v: time.m, l: "min" },
          { v: time.s, l: "sec" },
        ].map(({ v, l }, i) => (
          <div key={l} className="flex items-center gap-2">
            <div className="countdown-block">
              <div className="countdown-number">{String(v).padStart(2, "0")}</div>
              <div className="countdown-label">{l}</div>
            </div>
            {i < 3 && <span className="text-lg font-bold" style={{ color: "var(--muted)" }}>:</span>}
          </div>
        ))}
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: pct < 60 ? "var(--walrus)" : pct < 85 ? "#f59e0b" : "#ef4444",
          }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: VaultStatus }) {
  if (status === "alive") return <span className="badge-alive"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Alive</span>;
  if (status === "dormant") return <span className="badge-dormant"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-pulse" /> Dormant</span>;
  if (status === "settled_revealed") return <span className="badge-settled">Revealed</span>;
  return <span className="badge-settled" style={{ color: "#f87171" }}>Burned</span>;
}

export default function MyVaults() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [vaults, setVaults] = useState<VaultUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<"default" | "granted" | "denied">("default");

  const loadVaults = useCallback(async () => {
    if (!account?.address) return;
    setLoading(true);
    try {
      const raw = await fetchVaultsByOwner(account.address);
      const mapped = raw.map((r) => mapRawVault(r as Record<string, unknown>));
      setVaults(mapped);
      // Fire notification checks after loading
      checkVaultNotifications(mapped.map((v) => ({
        id: v.id,
        label: v.conditionLabel || v.label,
        status: v.status,
        deadlineMs: v.deadlineMs,
        intervalMs: v.intervalMs,
      })));
    } catch (e) {
      console.error("Failed to load vaults", e);
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  // Register service worker + check existing permission
  useEffect(() => {
    registerSW();
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission as "default" | "granted" | "denied");
    }
  }, []);

  useEffect(() => { loadVaults(); }, [loadVaults]);

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? "granted" : "denied");
    if (granted) checkVaultNotifications(vaults.map((v) => ({
      id: v.id,
      label: v.conditionLabel || v.label,
      status: v.status,
      deadlineMs: v.deadlineMs,
      intervalMs: v.intervalMs,
    })));
  }

  async function handleCheckIn(vaultId: string) {
    setCheckingIn(vaultId);
    try {
      const tx = buildCheckInTx(vaultId);
      await signAndExecute({ transaction: tx });
      await loadVaults();
    } catch (e) {
      console.error("Check-in failed", e);
    } finally {
      setCheckingIn(null);
    }
  }

  async function handleSettle(vaultId: string) {
    setSettling(vaultId);
    try {
      const tx = buildSettleTx(vaultId);
      await signAndExecute({ transaction: tx });
      await loadVaults();
    } catch (e) {
      console.error("Settle failed", e);
    } finally {
      setSettling(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6" style={{ paddingTop: "80px", paddingBottom: "48px" }}>
      <a href="/create" style={{ position: "fixed", top: "24px", right: "24px", zIndex: 50 }}>
        <button className="btn-primary" style={{ padding: "10px 22px", fontSize: "14px" }}>+ New Vault</button>
      </a>

      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2">My <span style={{ color: "var(--walrus)" }}>Vaults</span></h1>
        <p style={{ color: "var(--muted)" }}>Check in to hold delivery.</p>
      </div>

      {/* Notification permission banner */}
      {notifPermission === "default" && (
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-2xl mb-6"
          style={{ background: "rgba(120,240,212,0.06)", border: "1px solid rgba(120,240,212,0.18)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <div>
              <div className="text-sm font-semibold">Get deadline reminders</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>We&apos;ll notify you before any vault settles — no spam, just timely alerts.</div>
            </div>
          </div>
          <button
            className="btn-primary shrink-0"
            style={{ padding: "8px 18px", fontSize: "13px" }}
            onClick={handleEnableNotifications}
          >
            Enable
          </button>
        </div>
      )}

      {notifPermission === "granted" && (
        <div
          className="flex items-center gap-3 p-3 rounded-2xl mb-6 text-sm"
          style={{ background: "rgba(120,240,212,0.04)", border: "1px solid rgba(120,240,212,0.10)" }}
        >
          <span>✅</span>
          <span style={{ color: "var(--muted)" }}>Notifications on — you&apos;ll be reminded at 50%, 80%, and 95% of each vault&apos;s countdown.</span>
        </div>
      )}

      {/* Summary bar */}
      <div
        className="grid grid-cols-3 gap-4 mb-8 p-6 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {[
          { label: "Total Vaults", value: vaults.length },
          { label: "Active", value: vaults.filter((v) => v.status === "alive").length, color: "#22c55e" },
          { label: "Dormant", value: vaults.filter((v) => v.status === "dormant").length, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold mb-1" style={{ color: s.color || "var(--walrus)" }}>{s.value}</div>
            <div className="text-sm" style={{ color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {!account && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔌</div>
          <p style={{ color: "var(--muted)" }}>Connect your wallet to see your vaults.</p>
        </div>
      )}

      {account && loading && (
        <div className="text-center py-16" style={{ color: "var(--muted)" }}>Loading vaults...</div>
      )}

      {account && !loading && vaults.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2">No vaults yet</h3>
          <p className="mb-6" style={{ color: "var(--muted)" }}>Create your first vault.</p>
          <a href="/create"><button className="btn-primary">Create a Vault</button></a>
        </div>
      )}

      <div className="space-y-5">
        {vaults.map((vault, i) => (
          <ScrollReveal key={vault.id} delay={i * 80}>
          <div className="glass-card p-7">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold truncate max-w-xs">{vault.label || "Vault"}</h3>
                  <StatusBadge status={vault.status} />
                </div>
                <div className="text-xs font-mono mt-1" style={{ color: "var(--muted)" }}>{vault.id.slice(0, 20)}…</div>
                <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  <span style={{ color: vault.rule === "reveal" ? "var(--walrus)" : "#ef4444" }}>
                    {vault.rule === "reveal" ? "📬 Reveal on settle" : "🔥 Burn on settle"}
                  </span>
                </div>
              </div>
              <div className="text-right text-sm shrink-0 ml-4">
                <div style={{ color: "var(--muted)" }}>Recipient</div>
                <div className="font-medium truncate max-w-[160px]">{vault.heirContact}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>via {vault.delivery}</div>
              </div>
            </div>

            <div
              className="p-5 rounded-xl mb-5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <Countdown vault={vault} />
            </div>

            <div className="flex gap-3">
              {vault.status === "alive" && vault.conditionType === COND.PING && (
                <button
                  className="btn-heartbeat flex-1"
                  style={{ padding: "12px" }}
                  disabled={checkingIn === vault.id}
                  onClick={() => handleCheckIn(vault.id)}
                >
                  {checkingIn === vault.id ? "Checking in..." : "⚡ Check In"}
                </button>
              )}
              {vault.status === "dormant" && (
                <>
                  <button
                    className="btn-primary flex-1"
                    style={{ padding: "12px", background: "linear-gradient(135deg, #ef4444, #b91c1c)" }}
                    disabled={checkingIn === vault.id}
                    onClick={() => handleCheckIn(vault.id)}
                  >
                    {checkingIn === vault.id ? "Reviving..." : "⚡ Revive"}
                  </button>
                  <button
                    className="btn-primary flex-1"
                    style={{ padding: "12px" }}
                    disabled={settling === vault.id}
                    onClick={() => handleSettle(vault.id)}
                  >
                    {settling === vault.id ? "Settling..." : "📬 Settle Now"}
                  </button>
                </>
              )}
              {(vault.status === "settled_revealed" || vault.status === "settled_burned") && (
                <div
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold"
                  style={{ padding: "12px", background: vault.status === "settled_revealed" ? "rgba(120,240,212,0.08)" : "rgba(239,68,68,0.08)", color: vault.status === "settled_revealed" ? "var(--walrus)" : "#ef4444", border: `1px solid ${vault.status === "settled_revealed" ? "rgba(120,240,212,0.2)" : "rgba(239,68,68,0.2)"}` }}
                >
                  {vault.status === "settled_revealed" ? "📬 Files Delivered" : "🔥 Files Burned"}
                </div>
              )}
              <a href={`https://suiscan.xyz/testnet/object/${vault.id}`} target="_blank" rel="noopener noreferrer">
                <button className="btn-ghost" style={{ padding: "12px 20px" }}>View on Explorer</button>
              </a>
            </div>
          </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
