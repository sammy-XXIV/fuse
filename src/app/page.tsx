import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

const steps = [
  {
    n: "01",
    title: "Upload",
    body: "Add any files — documents, contracts, photos, passwords, instructions. Encrypted locally before anything leaves your device.",
  },
  {
    n: "02",
    title: "Set a Recipient",
    body: "Enter a Gmail, phone number, or wallet address. They do nothing upfront — Fuse reaches out automatically when delivery fires.",
  },
  {
    n: "03",
    title: "Set Your Condition",
    body: "Define when delivery fires — a date, a check-in timeout, a guardian vote, or plain English. Fuse handles the rest.",
  },
];

const reasons = [
  {
    title: "Encrypted",
    body: "AES-256, client-side. Your files are locked before they touch Walrus storage. Nobody reads them — not even Fuse.",
  },
  {
    title: "Trustless",
    body: "Rules live in a Sui smart contract. No company, no server, no human can override what you set.",
  },
  {
    title: "Automatic",
    body: "Condition met — Walrus releases the storage, Seal releases the key. Delivery fires itself, no action needed.",
  },
  {
    title: "No Crypto Required",
    body: "Recipients claim via Gmail or SMS. They never need a wallet, a seed phrase, or any crypto knowledge.",
  },
];

const usecases = [
  { icon: "📜", label: "Legal documents on a deadline" },
  { icon: "🔐", label: "Passwords to your family" },
  { icon: "📰", label: "Journalist dead-drop" },
  { icon: "🎂", label: "Message delivered on a birthday" },
  { icon: "🤝", label: "Contract auto-delivery at signing" },
  { icon: "🗝️", label: "Crypto access for your co-founder" },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen">
      <div className="noise-layer" />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 min-h-screen overflow-hidden">
        {/* Floating rings */}
        <div className="hero-ring hero-ring-1" />
        <div className="hero-ring hero-ring-2" />
        <div className="hero-ring hero-ring-3" />
        <p className="text-sm font-medium mb-6 tracking-widest uppercase" style={{ color: "var(--walrus)", letterSpacing: "0.2em" }}>
          Encrypted File Delivery · Built on Sui
        </p>

        <h1
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: "clamp(80px, 16vw, 180px)",
            lineHeight: 0.9,
            letterSpacing: "0.04em",
            marginBottom: "24px",
            background: "linear-gradient(160deg, #ffffff 20%, #78F0D4 60%, #38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 40px rgba(120,240,212,0.25))",
          }}
        >
          FUSE
        </h1>

        <p
          className="text-xl md:text-2xl mb-4 font-medium"
          style={{ color: "var(--walrus)", maxWidth: 500, lineHeight: 1.5 }}
        >
          Your files. Your rules.
          <br />
          Delivered automatically when the time is right.
        </p>

        <p className="text-base mb-12" style={{ color: "var(--muted)", maxWidth: 440, lineHeight: 1.7 }}>
          Set a recipient, define a condition in plain English, and Fuse handles delivery — no lawyers, no banks, no middlemen.
        </p>

        <Link href="/app">
          <button
            className="btn-primary"
            style={{ padding: "16px 48px", fontSize: "16px", letterSpacing: "0.05em" }}
          >
            Enter App
          </button>
        </Link>

        {/* Scroll hint */}
        <div className="absolute bottom-10 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs tracking-widest uppercase" style={{ color: "var(--muted)" }}>scroll</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }} />
          </svg>
        </div>
      </section>

      {/* Use cases */}
      <section className="px-6 pb-16 max-w-4xl mx-auto">
        <ScrollReveal>
          <p className="text-xs font-semibold tracking-widest uppercase mb-6 text-center" style={{ color: "var(--muted)" }}>
            Use cases
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {usecases.map((u) => (
              <div
                key={u.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{ background: "rgba(120,240,212,0.05)", border: "1px solid rgba(120,240,212,0.12)", color: "var(--muted)" }}
              >
                <span>{u.icon}</span>
                <span>{u.label}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <ScrollReveal>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4 text-center" style={{ color: "var(--walrus)" }}>
            How it works
          </p>
          <h2 className="text-center mb-14" style={{ fontSize: "clamp(36px, 6vw, 56px)" }}>
            Three steps. Then forget about it.
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <ScrollReveal key={s.n} delay={i * 120}>
              <div className="glass-card p-8 h-full">
                <div className="step-number">{s.n}</div>
                <h3 className="text-2xl mb-3">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{s.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Why Fuse */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <ScrollReveal>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4 text-center" style={{ color: "var(--walrus)" }}>
            Why Fuse
          </p>
          <h2 className="text-center mb-14" style={{ fontSize: "clamp(36px, 6vw, 56px)" }}>
            Built different.
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-5">
          {reasons.map((r, i) => (
            <ScrollReveal key={r.title} delay={i * 100}>
              <div className="glass-card animated-border p-8 flex gap-5 h-full">
                <div
                  className="w-1 rounded-full shrink-0 mt-1"
                  style={{ background: "var(--walrus)", minHeight: "100%" }}
                />
                <div>
                  <h3 className="text-xl mb-2">{r.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{r.body}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Powered by */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <ScrollReveal>
          <p className="text-xs font-semibold tracking-widest uppercase mb-8 text-center" style={{ color: "var(--muted)" }}>
            Powered by
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {["Sui", "Walrus", "Seal", "Tatum"].map((b) => (
              <span
                key={b}
                className="text-sm font-semibold tracking-wider"
                style={{ color: "var(--muted)", letterSpacing: "0.1em" }}
              >
                {b}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-28 text-center">
        <ScrollReveal>
          <h2
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(48px, 10vw, 100px)",
              lineHeight: 1,
              letterSpacing: "0.04em",
              marginBottom: "24px",
            }}
          >
            Ready to light the{" "}
            <span style={{ color: "var(--walrus)" }}>Fuse?</span>
          </h2>
          <p className="text-base mb-10" style={{ color: "var(--muted)" }}>
            Free to start. No wallet required for recipients.
          </p>
          <Link href="/app">
            <button
              className="btn-primary"
              style={{ padding: "16px 48px", fontSize: "16px" }}
            >
              Enter App
            </button>
          </Link>
        </ScrollReveal>
      </section>

    </div>
  );
}
