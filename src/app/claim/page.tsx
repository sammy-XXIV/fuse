"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchVault } from "@/lib/contract";
import { downloadFromWalrus } from "@/lib/walrus";
import { decryptFiles } from "@/lib/crypto";

type Step = "loading" | "ready" | "decrypting" | "done" | "error" | "not_found" | "no_key";

interface DecryptedFile {
  name: string;
  type: string;
  dataB64: string;
}

interface VaultInfo {
  blobId: string;
  heirContact: string;
  conditionLabel: string;
  state: number;
}

function downloadFile(file: DecryptedFile) {
  const bytes = Uint8Array.from(atob(file.dataB64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: file.type || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

function formatSize(b64: string) {
  const bytes = Math.round((b64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClaimPage() {
  const [step, setStep] = useState<Step>("loading");
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [files, setFiles] = useState<DecryptedFile[]>([]);
  const [error, setError] = useState("");
  const [keyB64, setKeyB64] = useState("");

  const load = useCallback(async (vid: string) => {
    try {
      const raw = await fetchVault(vid) as Record<string, unknown> | null;
      if (!raw) { setStep("not_found"); return; }

      setVault({
        blobId: raw.blob_id as string,
        heirContact: raw.heir_contact as string,
        conditionLabel: raw.condition_label as string,
        state: Number(raw.state ?? 0),
      });
      setStep("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get("vault") ?? "";
    const key = window.location.hash.replace("#", "");

    setKeyB64(key);

    if (!vid) { setStep("not_found"); return; }
    if (!key) { setStep("no_key"); return; }

    load(vid);
  }, [load]);

  async function handleDecrypt() {
    if (!vault || !keyB64) return;
    setStep("decrypting");
    try {
      const encrypted = await downloadFromWalrus(vault.blobId);
      const decrypted = await decryptFiles(encrypted, keyB64);
      setFiles(decrypted);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  const stateLabel = (s: number) => {
    if (s === 0) return { text: "Vault still active — files not yet released", color: "#22c55e", canClaim: false };
    if (s === 1) return { text: "Vault dormant — ready to settle", color: "#f59e0b", canClaim: true };
    return { text: "Vault settled — files ready", color: "var(--walrus)", canClaim: true };
  };

  return (
    <div className="max-w-lg mx-auto px-6 pt-20 pb-16">
      <div className="text-center mb-10">
        <div className="text-5xl mb-5">⚡</div>
        <h1 className="text-4xl font-bold mb-3">
          Claim your <span style={{ color: "var(--walrus)" }}>files</span>
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Files sent to you via Fuse encrypted delivery.
        </p>
      </div>

      <div className="glass-card p-8">

        {step === "loading" && (
          <div className="text-center py-10" style={{ color: "var(--muted)" }}>
            <div className="text-3xl mb-4 animate-spin" style={{ display: "inline-block" }}>⚙️</div>
            <p>Looking up your vault...</p>
          </div>
        )}

        {step === "not_found" && (
          <div className="text-center py-10">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-lg font-semibold mb-2">No vault found</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              This link doesn&apos;t contain a valid vault ID. Use the exact link from the email or SMS.
            </p>
          </div>
        )}

        {step === "no_key" && (
          <div className="text-center py-10">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-lg font-semibold mb-2">Missing decryption key</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              The decryption key is missing from this link. Use the exact link from the email or SMS — don&apos;t copy just the URL bar without the full link including the # part.
            </p>
          </div>
        )}

        {step === "ready" && vault && (() => {
          const { text, color, canClaim } = stateLabel(vault.state);
          return (
            <div>
              <div
                className="flex items-center gap-3 p-4 rounded-xl mb-6"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <span className="text-2xl">✅</span>
                <div>
                  <div className="font-semibold text-green-400">Vault found</div>
                  <div className="text-sm" style={{ color: "var(--muted)" }}>Your files are waiting</div>
                </div>
              </div>

              <div
                className="p-5 rounded-xl mb-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-sm font-medium mb-3" style={{ color: "var(--walrus)" }}>Vault Details</div>
                <div className="space-y-2 text-sm">
                  {vault.conditionLabel && (
                    <div className="flex justify-between gap-4">
                      <span style={{ color: "var(--muted)" }}>Condition</span>
                      <span className="font-medium text-right">{vault.conditionLabel}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span style={{ color: "var(--muted)" }}>Status</span>
                    <span className="font-medium" style={{ color }}>{text}</span>
                  </div>
                </div>
              </div>

              {canClaim ? (
                <button
                  className="btn-primary w-full"
                  style={{ padding: "14px" }}
                  onClick={handleDecrypt}
                >
                  🔓 Decrypt &amp; Download Files
                </button>
              ) : (
                <div
                  className="p-4 rounded-xl text-sm text-center"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
                >
                  The sender&apos;s condition hasn&apos;t been met yet. Check back when the vault settles.
                </div>
              )}
            </div>
          );
        })()}

        {step === "decrypting" && (
          <div className="text-center py-8">
            <div className="text-5xl mb-6 animate-spin" style={{ display: "inline-block" }}>⚙️</div>
            <h2 className="text-xl font-semibold mb-3">Decrypting your files...</h2>
            <div className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
              <p>⟳ Fetching encrypted data from Walrus...</p>
              <p>⟳ Decrypting with AES-256-GCM...</p>
            </div>
            <div className="mt-6 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: "80%", background: "var(--walrus)", animation: "progress 2s ease-out forwards" }}
              />
            </div>
            <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
          </div>
        )}

        {step === "done" && (
          <div>
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🔓</div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--walrus)" }}>Files Unlocked</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {files.length} file{files.length !== 1 ? "s" : ""} decrypted and ready to download.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <div className="text-sm font-medium">{f.name}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{formatSize(f.dataB64)}</div>
                    </div>
                  </div>
                  <button
                    className="text-sm font-medium px-3 py-1.5 rounded-lg"
                    style={{
                      background: "rgba(120,240,212,0.10)",
                      border: "1px solid rgba(120,240,212,0.25)",
                      color: "var(--walrus)",
                      cursor: "pointer",
                    }}
                    onClick={() => downloadFile(f)}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>

            <button
              className="btn-primary w-full"
              style={{ padding: "14px" }}
              onClick={() => files.forEach(downloadFile)}
            >
              Download All Files
            </button>

            <div
              className="mt-5 p-4 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p style={{ color: "var(--muted)" }}>
                Files were decrypted entirely in your browser. The decryption key never touched any server.
              </p>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-10">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{error}</p>
            <button className="btn-ghost" style={{ padding: "10px 24px" }} onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
