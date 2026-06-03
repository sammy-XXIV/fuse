"use client";
import { useState } from "react";

type ClaimStep = "lookup" | "verify" | "decrypting" | "done";

export default function ClaimPage() {
  const [step, setStep] = useState<ClaimStep>("lookup");
  const [method, setMethod] = useState<"gmail" | "sms" | "wallet">("gmail");
  const [input, setInput] = useState("");

  const handleLookup = () => {
    if (!input) return;
    setStep("verify");
  };

  const handleVerify = () => {
    setStep("decrypting");
    setTimeout(() => setStep("done"), 2500);
  };

  return (
    <div className="max-w-lg mx-auto px-6 pt-20 pb-16">
      <div className="text-center mb-10">
        <div className="text-5xl mb-5">⚡</div>
        <h1 className="text-4xl font-bold mb-3">
          Claim your <span style={{ color: "var(--walrus)" }}>files</span>
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Verify your identity to access files sent to you.
        </p>
      </div>

      <div className="glass-card p-8">
        {/* Lookup */}
        {step === "lookup" && (
          <div>
            <h2 className="text-lg font-semibold mb-5">Find your vault</h2>

            <div className="toggle-group mb-5">
              {(["gmail", "sms", "wallet"] as const).map((m) => (
                <button
                  key={m}
                  className={`toggle-tab ${method === m ? "active" : ""}`}
                  onClick={() => { setMethod(m); setInput(""); }}
                >
                  {m === "gmail" && "📧 Gmail"}
                  {m === "sms" && "📱 SMS"}
                  {m === "wallet" && "👛 Wallet"}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <label className="text-sm font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                {method === "gmail" && "Your Gmail address"}
                {method === "sms" && "Your phone number"}
                {method === "wallet" && "Your Sui wallet address"}
              </label>
              <input
                type={method === "gmail" ? "email" : "text"}
                className="glass-input"
                placeholder={
                  method === "gmail" ? "you@gmail.com" :
                  method === "sms" ? "+1 234 567 8900" :
                  "0x..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>

            <button
              className="btn-primary w-full"
              style={{ padding: "14px" }}
              onClick={handleLookup}
              disabled={!input}
            >
              Look Up My Vault
            </button>

            <div className="divider" />

            <div
              className="flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{ background: "rgba(120,240,212,0.05)", border: "1px solid rgba(120,240,212,0.12)" }}
            >
              <span>ℹ️</span>
              <p style={{ color: "var(--muted)" }}>
                You don&apos;t need a crypto wallet. Just use the same Gmail or phone number the sender registered for you.
              </p>
            </div>
          </div>
        )}

        {/* Verify */}
        {step === "verify" && (
          <div>
            <div
              className="flex items-center gap-3 p-4 rounded-xl mb-6"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <span className="text-2xl">✅</span>
              <div>
                <div className="font-semibold text-green-400">Vault found</div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  1 vault is waiting for you
                </div>
              </div>
            </div>

            {/* Vault preview */}
            <div
              className="p-5 rounded-xl mb-6"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="text-sm font-medium mb-3 gradient-text-green">Vault Details</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>From</span>
                  <span className="font-medium">0x1a2b...3c4d</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>Files</span>
                  <span className="font-medium">3 encrypted files</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>Status</span>
                  <span className="badge-settled">Ready to claim</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>Settled</span>
                  <span className="font-medium">June 1, 2026</span>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">Verify your identity</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              {method === "gmail" && "Sign in with Google to prove you own this Gmail address."}
              {method === "sms" && "We'll send a verification code to confirm your number."}
              {method === "wallet" && "Connect your wallet to prove ownership."}
            </p>

            <button
              className="btn-primary w-full mb-3"
              style={{ padding: "14px" }}
              onClick={handleVerify}
            >
              {method === "gmail" && "🔵 Sign in with Google"}
              {method === "sms" && "📱 Send Verification Code"}
              {method === "wallet" && "👛 Connect Wallet"}
            </button>
            <button
              className="btn-ghost w-full"
              style={{ padding: "12px" }}
              onClick={() => setStep("lookup")}
            >
              ← Back
            </button>
          </div>
        )}

        {/* Decrypting */}
        {step === "decrypting" && (
          <div className="text-center py-8">
            <div className="text-5xl mb-6 animate-spin" style={{ display: "inline-block" }}>⚙️</div>
            <h2 className="text-xl font-semibold mb-3">Decrypting your files...</h2>
            <div className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
              <p>✓ Identity verified on Sui</p>
              <p>✓ Seal releasing decryption key...</p>
              <p className="animate-pulse">⟳ Fetching encrypted blobs from Walrus...</p>
            </div>
            <div className="mt-6 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: "70%",
                  background: "var(--walrus)",
                  animation: "progress 2.5s ease-out forwards",
                }}
              />
            </div>
            <style>{`
              @keyframes progress { from { width: 0% } to { width: 100% } }
            `}</style>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="text-center">
            <div className="text-5xl mb-5">🔓</div>
            <h2 className="text-2xl font-bold mb-2 gradient-text">Files Unlocked</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Your files have been decrypted and are ready to download.
            </p>

            <div className="space-y-3 mb-6 text-left">
              {[
                { name: "documents.pdf", size: "124 KB" },
                { name: "access_keys.txt", size: "2.1 KB" },
                { name: "instructions.docx", size: "88 KB" },
              ].map((f) => (
                <div
                  key={f.name}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <div className="text-sm font-medium">{f.name}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{f.size}</div>
                    </div>
                  </div>
                  <button
                    className="text-sm font-medium px-3 py-1.5 rounded-lg"
                    style={{
                      background: "rgba(120,240,212,0.10)",
                      border: "1px solid rgba(120,240,212,0.25)",
                      color: "var(--walrus)",
                    }}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>

            <button className="btn-primary w-full" style={{ padding: "14px" }}>
              Download All Files
            </button>

            <div
              className="mt-5 p-4 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p style={{ color: "var(--muted)" }}>
                This claim is recorded on Sui. The vault is now settled and these files will be available on Walrus until the storage epoch expires.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
