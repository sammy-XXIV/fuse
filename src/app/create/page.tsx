"use client";
import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import ConditionParser from "@/components/ConditionParser";
import { encryptFiles } from "@/lib/crypto";
import { uploadToWalrus } from "@/lib/walrus";
import { buildCreateVaultTx, COND, RULE } from "@/lib/contract";

type VaultRule = "reveal" | "burn";

const W = "rgba(120,240,212,";
const ZERO_ADDR = "0x0000000000000000000000000000000000000000000000000000000000000000";

function conditionToArgs(condition: Record<string, unknown>, guardianAddrs: string[] = [], guardianThresh = 1) {
  const type = condition.type as string;
  const params = (condition.params ?? {}) as Record<string, unknown>;

  const base = {
    conditionType: COND.PING,
    intervalMs: 30 * 24 * 60 * 60 * 1000,
    gracePeriodMs: 7 * 24 * 60 * 60 * 1000,
    fireDateMs: 0,
    triggerWallet: null as string | null,
    guardians: [] as string[],
    guardianThreshold: 0,
  };

  if (type === "PING_TIMEOUT") {
    const days = Number(params.interval_days ?? params.intervalDays ?? 30);
    return { ...base, conditionType: COND.PING, intervalMs: Math.round(days * 86400000) };
  }
  if (type === "DATE_LOCK") {
    const ms = Number(params.fireDateMs ?? Date.now() + 86400000 * 30);
    return { ...base, conditionType: COND.DATE, fireDateMs: ms };
  }
  if (type === "GUARDIAN_CONFIRM") {
    return {
      ...base,
      conditionType: COND.GUARDIAN,
      guardians: guardianAddrs,
      guardianThreshold: guardianThresh,
    };
  }
  if (type === "WALLET_TRIGGER") {
    return {
      ...base,
      conditionType: COND.WALLET,
      triggerWallet: (params.triggerWallet as string) ?? null,
    };
  }
  return base;
}

export default function CreateVault() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [step, setStep] = useState(1);
  const [rule, setRule] = useState<VaultRule>("reveal");
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Recipients — multiple emails with + button
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [threshold, setThreshold] = useState(1);
  const [message, setMessage] = useState("");

  const [condition, setCondition] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<"idle" | "encrypting" | "uploading" | "signing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [vaultId, setVaultId] = useState("");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validRecipients = recipients.filter(r => r.includes("@"));

  async function handleLightFuse() {
    if (!account) { setErrorMsg("Connect your wallet first."); setStatus("error"); return; }
    if (!condition) return;

    try {
      setStatus("encrypting");
      const { encrypted, keyB64 } = await encryptFiles(files);

      setStatus("uploading");
      const { blobId } = await uploadToWalrus(encrypted, 5);

      // For GUARDIAN_CONFIRM: recipients are the guardians
      // Derive wallet addresses from their emails server-side
      let guardianAddresses: string[] = [];
      if (condition.type === "GUARDIAN_CONFIRM") {
        const res = await fetch("/api/guardian/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: validRecipients }),
        });
        const data = await res.json();
        guardianAddresses = data.addresses.map((a: { address: string }) => a.address);
      }

      const condArgs = conditionToArgs(condition, guardianAddresses, threshold);
      const tx = buildCreateVaultTx({
        blobId,
        heir: account.address, // contract needs valid address; actual delivery is via email
        deliveryMethod: "gmail",
        heirContact: validRecipients.join(","),
        conditionLabel: condition.human_readable as string,
        rule: rule === "reveal" ? RULE.REVEAL : RULE.BURN,
        ...condArgs,
      });

      setStatus("signing");
      const result = await signAndExecute({ transaction: tx });

      const created = (result as { effects?: { created?: { reference?: { objectId: string } }[] } })
        ?.effects?.created;
      const newVaultId = created?.[0]?.reference?.objectId ?? "";
      setVaultId(newVaultId);

      const claimUrl = `${window.location.origin}/claim?vault=${newVaultId}#${keyB64}`;

      if (condition.type === "GUARDIAN_CONFIRM") {
        // Email all recipients as guardians — they vote to release files
        await fetch("/api/guardian/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails: validRecipients,
            vaultId: newVaultId,
            appUrl: window.location.origin,
            claimUrl,
            personalMessage: message,
          }),
        });
      } else {
        // Email all recipients as notification
        await Promise.all(validRecipients.map(email =>
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              heirContact: email,
              claimUrl,
              conditionLabel: condition.human_readable as string,
              personalMessage: message,
              delivery: "gmail",
            }),
          })
        ));
      }

      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="glass-card p-12">
          <div className="text-6xl mb-6">⚡</div>
          <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--walrus)" }}>Fuse is lit.</h2>
          <p className="mb-6" style={{ color: "var(--muted)" }}>
            Your files are encrypted on Walrus and the vault is live on Sui testnet.
          </p>
          {vaultId && (
            <div className="p-4 rounded-xl mb-6 text-left" style={{ background: `${W}0.06)`, border: `1px solid ${W}0.2)` }}>
              <div className="text-xs font-semibold mb-1" style={{ color: "var(--walrus)" }}>Vault ID</div>
              <div className="text-xs font-mono break-all" style={{ color: "var(--muted)" }}>{vaultId}</div>
            </div>
          )}
          <div className="flex gap-4 justify-center">
            <a href="/vaults"><button className="btn-primary" style={{ padding: "12px 28px" }}>View My Vaults</button></a>
            <button className="btn-ghost" style={{ padding: "12px 28px" }} onClick={() => {
              setStatus("idle"); setStep(1); setFiles([]); setCondition(null);
              setRecipients([""]); setThreshold(1); setMessage("");
            }}>Create Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pt-20 pb-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">New <span style={{ color: "var(--walrus)" }}>Vault</span></h1>
        <p style={{ color: "var(--muted)" }}>Encrypted before it leaves your device.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center mb-4" style={{ maxWidth: 360, margin: "0 auto 16px" }}>
        {[1, 2, 3].map((s) => (
          <div key={s} className="contents">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300"
              style={{ background: step >= s ? "var(--walrus)" : `${W}0.06)`, color: step >= s ? "#050F0A" : "var(--muted)" }}
            >{step > s ? "✓" : s}</div>
            {s < 3 && <div className="h-px flex-1 transition-all duration-500" style={{ background: step > s ? "var(--walrus)" : `${W}0.12)` }} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs mb-8" style={{ color: "var(--muted)", maxWidth: 360, margin: "0 auto 32px" }}>
        <span style={{ color: step >= 1 ? "var(--walrus)" : undefined }}>Upload Files</span>
        <span style={{ color: step >= 2 ? "var(--walrus)" : undefined }}>Set Recipients</span>
        <span style={{ color: step >= 3 ? "var(--walrus)" : undefined }}>Vault Rules</span>
      </div>

      <div className="glass-card p-8">

        {/* Step 1: Upload */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Upload your files</h2>
            <div
              className="upload-zone mb-6"
              style={{ borderColor: dragOver ? "var(--walrus)" : undefined }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <input id="fileInput" type="file" multiple className="hidden" onChange={handleFileInput} />
              <div className="text-4xl mb-3">📁</div>
              <p className="font-medium mb-1">Drop files here or click to browse</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Documents, contracts, photos, passwords — anything you want delivered at the right time</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mb-6">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: `${W}0.04)`, border: `1px solid ${W}0.10)` }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📄</span>
                      <div>
                        <div className="text-sm font-medium">{f.name}</div>
                        <div className="text-xs" style={{ color: "var(--muted)" }}>{formatSize(f.size)}</div>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-lg opacity-40 hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-xl text-sm" style={{ background: `${W}0.06)`, border: `1px solid ${W}0.15)` }}>
              <span>🔒</span>
              <p style={{ color: "var(--muted)" }}>Files are encrypted locally using AES-256 before upload. Your key never leaves your device.</p>
            </div>

            <button className="btn-primary w-full mt-6" style={{ padding: "14px" }} disabled={files.length === 0} onClick={() => setStep(2)}>
              Continue — Set Recipients →
            </button>
          </div>
        )}

        {/* Step 2: Recipients */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Who receives your files?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Add one or more recipients. They&apos;ll be notified when files are ready — no crypto wallet needed.
            </p>

            <div className="space-y-3 mb-4">
              {recipients.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="email"
                    className="glass-input flex-1"
                    placeholder={`Recipient ${i + 1} email`}
                    value={r}
                    onChange={(e) => {
                      const updated = [...recipients];
                      updated[i] = e.target.value;
                      setRecipients(updated);
                    }}
                  />
                  {recipients.length > 1 && (
                    <button
                      onClick={() => {
                        const updated = recipients.filter((_, idx) => idx !== i);
                        setRecipients(updated);
                        setThreshold(Math.min(threshold, updated.length));
                      }}
                      className="text-lg opacity-40 hover:opacity-100 transition-opacity px-1"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setRecipients([...recipients, ""])}
              className="text-sm px-4 py-2 rounded-xl mb-6 transition-all"
              style={{ background: `${W}0.06)`, color: "var(--walrus)", border: `1px solid ${W}0.15)` }}
            >+ Add recipient</button>

            {/* Threshold — only meaningful for 2+ recipients */}
            {recipients.filter(r => r.includes("@")).length > 1 && (
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background: `${W}0.04)`, border: `1px solid ${W}0.12)` }}>
                <span className="text-sm" style={{ color: "var(--muted)" }}>Approvals needed to release:</span>
                <select
                  className="glass-input"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "13px" }}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                >
                  {recipients.filter(r => r.includes("@")).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} of {recipients.filter(r => r.includes("@")).length}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-2">
              <label className="text-sm font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                Personal message <span style={{ opacity: 0.5 }}>(optional)</span>
              </label>
              <textarea
                className="glass-input"
                placeholder="Leave a note for your recipients — they'll see it when the vault settles..."
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ resize: "none" }}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button className="btn-ghost flex-1" style={{ padding: "14px" }} onClick={() => setStep(1)}>← Back</button>
              <button
                className="btn-primary flex-1"
                style={{ padding: "14px" }}
                disabled={validRecipients.length === 0}
                onClick={() => setStep(3)}
              >
                Continue — Vault Rules →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Condition + Deploy */}
        {step === 3 && (
          <div>
            {!condition ? (
              <ConditionParser onConfirm={(c) => setCondition(c as unknown as Record<string, unknown>)} />
            ) : (
              <div>
                <div className="flex items-center justify-between p-4 rounded-xl mb-6" style={{ background: `${W}0.06)`, border: `1px solid ${W}0.20)` }}>
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: "var(--walrus)" }}>Condition set</div>
                    <div className="text-sm">{condition.human_readable as string}</div>
                  </div>
                  <button onClick={() => setCondition(null)} className="text-xs px-3 py-1.5 rounded-lg ml-4 shrink-0" style={{ background: `${W}0.08)`, color: "var(--walrus)", border: `1px solid ${W}0.15)` }}>
                    Change
                  </button>
                </div>

                {/* For GUARDIAN_CONFIRM: show recipients will be the voters */}
                {condition.type === "GUARDIAN_CONFIRM" && (
                  <div className="p-4 rounded-xl mb-6" style={{ background: `${W}0.04)`, border: `1px solid ${W}0.12)` }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "var(--walrus)" }}>👥 Recipients will vote to release</div>
                    <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                      Each recipient gets an email asking them to approve the release. Files are delivered once <strong>{threshold} of {validRecipients.length}</strong> approve.
                    </p>
                    <div className="space-y-1">
                      {validRecipients.map((r, i) => (
                        <div key={i} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", color: "var(--walrus)" }}>
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <label className="text-sm font-medium mb-4 block">When it fires...</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setRule("reveal")}
                      className="p-5 rounded-xl text-left transition-all duration-200"
                      style={{ background: rule === "reveal" ? `${W}0.08)` : `${W}0.03)`, border: `1px solid ${rule === "reveal" ? W + "0.35)" : W + "0.08)"}` }}
                    >
                      <div className="text-2xl mb-2">📬</div>
                      <div className="font-semibold mb-1" style={{ color: rule === "reveal" ? "var(--walrus)" : undefined }}>Deliver</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>Files go to your recipients.</div>
                    </button>
                    <button
                      onClick={() => setRule("burn")}
                      className="p-5 rounded-xl text-left transition-all duration-200"
                      style={{ background: rule === "burn" ? "rgba(239,68,68,0.08)" : `${W}0.03)`, border: `1px solid ${rule === "burn" ? "rgba(239,68,68,0.4)" : W + "0.08)"}` }}
                    >
                      <div className="text-2xl mb-2">🔥</div>
                      <div className="font-semibold mb-1" style={{ color: rule === "burn" ? "#ef4444" : undefined }}>Burn</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>Files destroyed permanently.</div>
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-xl mb-6" style={{ background: `${W}0.04)`, border: `1px solid ${W}0.10)` }}>
                  <div className="text-xs font-semibold mb-3" style={{ color: "var(--walrus)" }}>Summary</div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Files", value: `${files.length} file${files.length !== 1 ? "s" : ""}` },
                      { label: "Recipients", value: `${validRecipients.length} email${validRecipients.length !== 1 ? "s" : ""}` },
                      { label: "Condition", value: condition.type as string },
                      { label: "On fire", value: rule, color: rule === "burn" ? "#ef4444" : "var(--walrus)" },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between">
                        <span style={{ color: "var(--muted)" }}>{r.label}</span>
                        <span className="font-medium capitalize" style={{ color: r.color }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {status === "error" && (
                  <div className="p-4 rounded-xl mb-4 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                    {errorMsg}
                  </div>
                )}

                {!account && (
                  <div className="p-4 rounded-xl mb-4 text-sm text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    Connect your wallet to deploy the vault.
                  </div>
                )}

                <div className="flex gap-3">
                  <button className="btn-ghost flex-1" style={{ padding: "14px" }} onClick={() => setStep(2)} disabled={status !== "idle" && status !== "error"}>← Back</button>
                  <button
                    className="btn-primary flex-1"
                    style={{ padding: "14px" }}
                    disabled={!account || (status !== "idle" && status !== "error")}
                    onClick={handleLightFuse}
                  >
                    {status === "encrypting" && "🔒 Encrypting..."}
                    {status === "uploading" && "☁️ Uploading to Walrus..."}
                    {status === "signing" && "✍️ Sign in wallet..."}
                    {(status === "idle" || status === "error") && "⚡ Light the Fuse"}
                  </button>
                </div>
              </div>
            )}

            {!condition && (
              <button className="btn-ghost w-full mt-4" style={{ padding: "12px" }} onClick={() => setStep(2)}>← Back</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
