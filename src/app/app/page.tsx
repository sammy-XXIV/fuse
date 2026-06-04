"use client";
import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ConnectButton } from "@mysten/dapp-kit";

export default function Home() {
  const account = useCurrentAccount();

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          {/* Logo mark */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-8"
            style={{ background: "rgba(120,240,212,0.08)", border: "1px solid rgba(120,240,212,0.20)" }}
          >
            ⚡
          </div>

          <h1
            className="font-black leading-none mb-3"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(72px, 16vw, 120px)", color: "var(--walrus)", letterSpacing: "0.04em" }}
          >
            FUSE
          </h1>

          <p className="text-base mb-10" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Encrypted files. Automatic delivery.<br />No trust required.
          </p>

          {/* Glass connect card */}
          <div
            className="p-8 rounded-2xl mb-6"
            style={{
              background: "rgba(13,24,41,0.55)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(120,240,212,0.14)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            }}
          >
            <p className="text-sm font-medium mb-6" style={{ color: "var(--muted)" }}>
              Connect your Sui wallet to continue
            </p>

            <ConnectButton
              connectText="Connect Wallet"
              style={{
                width: "100%",
                background: "var(--walrus)",
                color: "#060D1A",
                border: "none",
                borderRadius: "12px",
                padding: "14px 24px",
                fontWeight: 700,
                fontSize: "15px",
                cursor: "pointer",
                display: "block",
              }}
            />

            <div
              className="flex items-center gap-3 mt-5 p-3 rounded-xl text-xs"
              style={{ background: "rgba(120,240,212,0.04)", border: "1px solid rgba(120,240,212,0.08)" }}
            >
              <span>🔒</span>
              <span style={{ color: "var(--muted)" }}>
                Sui, Slush, Phantom, OKX — any Sui wallet works.
              </span>
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Recipient receiving files?{" "}
            <Link href="/claim" style={{ color: "var(--walrus)" }}>
              Claim here
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-12 pb-12">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{
            background: "rgba(120,240,212,0.06)",
            border: "1px solid rgba(120,240,212,0.18)",
            color: "var(--walrus-dim)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--walrus)" }} />
          Connected · Sui Testnet
        </div>

        <h1
          className="font-black leading-none mb-4"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(80px, 15vw, 160px)", color: "var(--walrus)", letterSpacing: "0.04em" }}
        >
          FUSE
        </h1>

        <p className="text-lg mb-10" style={{ color: "var(--muted)", maxWidth: 380, lineHeight: 1.7 }}>
          Your files, delivered automatically when you go silent.
        </p>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link href="/create">
            <button className="btn-primary" style={{ padding: "14px 36px", fontSize: "15px" }}>
              ⚡ Create a Vault
            </button>
          </Link>
          <Link href="/vaults">
            <button className="btn-ghost" style={{ padding: "14px 36px", fontSize: "15px" }}>
              My Vaults
            </button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { n: "01", title: "Upload & Encrypt", body: "Drop your files. Encrypted locally before anything leaves your device." },
            { n: "02", title: "Set a Condition", body: "Natural language rules — \"if I go silent for 60 days\", a date, a guardian vote." },
            { n: "03", title: "It fires itself", body: "Stop checking in — Fuse fires and delivers everything automatically." },
          ].map((s) => (
            <div key={s.n} className="glass-card p-7">
              <div className="text-3xl font-black mb-4" style={{ color: "var(--walrus)" }}>{s.n}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Properties */}
      <section className="px-6 pb-20 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: "🔐", label: "Encrypted", sub: "AES-256, client-side. Nobody else can read your files." },
            { icon: "⛓", label: "Trustless", sub: "Sui smart contracts enforce the rules. No middlemen." },
            { icon: "📡", label: "Automatic", sub: "Walrus storage + Seal key release. It fires itself." },
          ].map((f) => (
            <div key={f.label} className="glass-card p-7 text-center">
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="font-semibold mb-2">{f.label}</div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{f.sub}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
