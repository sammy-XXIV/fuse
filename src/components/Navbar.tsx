"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { useState, useRef, useEffect } from "react";

function WalletMenu() {
  const account = useCurrentAccount();
  const { mutateAsync: disconnect } = useDisconnectWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!account) return null;

  const addr = account.address;
  const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  function copyAddress() {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200"
        style={{
          background: "rgba(120,240,212,0.08)",
          border: "1px solid rgba(120,240,212,0.20)",
          color: "var(--walrus)",
          fontWeight: 600,
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--walrus)", boxShadow: "0 0 6px rgba(120,240,212,0.8)" }} />
        {short}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-xl overflow-hidden z-50"
          style={{
            background: "rgba(10,18,32,0.95)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(120,240,212,0.14)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          }}
        >
          <button
            onClick={copyAddress}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left"
            style={{ color: "var(--text)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(120,240,212,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span>{copied ? "✓" : "📋"}</span>
            {copied ? "Copied!" : "Copy Address"}
          </button>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 12px" }} />
          <button
            onClick={async () => { setOpen(false); await disconnect(); window.location.reload(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left"
            style={{ color: "#f87171" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span>🔌</span>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/app",    label: "Home" },
    { href: "/create", label: "New Vault" },
    { href: "/vaults", label: "My Vaults" },
    { href: "/claim",  label: "Claim" },
  ];

  return (
    <nav
      className="relative z-50 flex items-center px-3 py-2 mx-3 mt-3 rounded-2xl md:px-6 md:py-3 md:mx-4 md:mt-4"
      style={{
        background: "rgba(8,18,14,0.70)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(120,240,212,0.10)",
      }}
    >
      {/* Logo — left */}
      <Link href="/app" className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--walrus)", color: "#050F0A" }}>
          ⚡
        </div>
        <span className="font-black text-base md:text-lg tracking-tight" style={{ color: "var(--walrus)" }}>Fuse</span>
      </Link>

      {/* Links — centered, hidden on very small screens */}
      <div className="flex-1 flex items-center justify-center gap-0.5 md:gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-2 py-1.5 rounded-xl text-xs md:text-sm md:px-4 md:py-2 font-medium transition-all duration-200"
            style={{
              color: pathname === l.href ? "var(--walrus)" : "var(--muted)",
              background: pathname === l.href ? "rgba(120,240,212,0.08)" : "transparent",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Wallet — right */}
      <div className="shrink-0">
        <WalletMenu />
      </div>
    </nav>
  );
}
