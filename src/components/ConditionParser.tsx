"use client";
import { useState } from "react";

type ConditionType = "PING_TIMEOUT" | "DATE_LOCK" | "GUARDIAN_CONFIRM" | "WALLET_TRIGGER" | "COMBINED" | "NOT_EXECUTABLE";

interface ParsedCondition {
  type: ConditionType;
  params: Record<string, unknown>;
  human_readable: string;
  executable: boolean;
  fallback: string | null;
  confidence: "high" | "medium" | "low";
}

const TYPE_LABELS: Record<ConditionType, { label: string; icon: string }> = {
  PING_TIMEOUT:     { label: "Periodic Ping",        icon: "📡" },
  DATE_LOCK:        { label: "Date Lock",             icon: "📅" },
  GUARDIAN_CONFIRM: { label: "Guardian Confirmation", icon: "👥" },
  WALLET_TRIGGER:   { label: "Wallet Trigger",        icon: "👛" },
  COMBINED:         { label: "Combined Condition",    icon: "🔗" },
  NOT_EXECUTABLE:   { label: "Not Executable",        icon: "⚠️" },
};

const EXAMPLES = [
  "If I don't reply to your ping for 60 days",
  "Send on January 1st 2027 no matter what",
  "If 2 of my 3 trusted contacts confirm",
  "When this wallet address sends a transaction",
  "If I miss a ping AND my brother confirms",
];

interface Props {
  onConfirm: (condition: ParsedCondition) => void;
}

export default function ConditionParser({ onConfirm }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedCondition | null>(null);
  const [error, setError] = useState("");

  const parse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/parse-condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: input }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch {
      setError("Couldn't interpret that condition. Try rephrasing.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError("");
  };

  const W = "rgba(120,240,212,";

  return (
    <div>
      <h2 className="text-2xl mb-2">Set your condition</h2>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Describe in plain English when your files should be delivered.
      </p>

      {!result ? (
        <>
          <textarea
            className="glass-input mb-3"
            rows={3}
            placeholder="e.g. If I don't reply to your ping for 60 days..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) parse(); }}
            style={{ resize: "none", lineHeight: 1.6 }}
          />

          {/* Examples */}
          <div className="flex flex-wrap gap-2 mb-6">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: `${W}0.05)`,
                  border: `1px solid ${W}0.12)`,
                  color: "var(--muted)",
                }}
              >
                {ex}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-sm mb-4" style={{ color: "#f87171" }}>{error}</p>
          )}

          <button
            className="btn-primary w-full"
            style={{ padding: "14px" }}
            onClick={parse}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `#060D1A ${W}0.3) ${W}0.3) ${W}0.3)` }} />
                Interpreting...
              </span>
            ) : "Interpret →"}
          </button>
        </>
      ) : (
        <div>
          {/* Result card */}
          <div
            className="p-6 rounded-2xl mb-5"
            style={{
              background: result.executable ? `${W}0.06)` : "rgba(239,68,68,0.06)",
              border: `1px solid ${result.executable ? W + "0.20)" : "rgba(239,68,68,0.20)"}`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{TYPE_LABELS[result.type].icon}</span>
                <span className="font-semibold">{TYPE_LABELS[result.type].label}</span>
              </div>
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: result.executable ? `${W}0.12)` : "rgba(239,68,68,0.12)",
                  color: result.executable ? "var(--walrus)" : "#f87171",
                }}
              >
                {result.executable ? "✓ Executable" : "✗ Not executable"}
              </span>
            </div>

            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text)" }}>
              {result.human_readable}
            </p>

            {/* Params */}
            {Object.keys(result.params).length > 0 && (
              <div className="space-y-1.5">
                {Object.entries(result.params).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span style={{ color: "var(--muted)" }}>{k.replace(/_/g, " ")}</span>
                    <span className="font-medium" style={{ color: "var(--walrus)" }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback suggestion */}
            {!result.executable && result.fallback && (
              <div
                className="mt-4 p-3 rounded-xl text-xs"
                style={{ background: "rgba(248,250,255,0.04)", border: "1px solid rgba(248,250,255,0.08)" }}
              >
                <span style={{ color: "var(--muted)" }}>
                  💡 Suggestion: {result.fallback}
                </span>
              </div>
            )}

            {/* Confidence */}
            {result.confidence === "low" && (
              <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
                ⚠ Low confidence — consider rephrasing if this doesn't look right.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              className="btn-ghost flex-1"
              style={{ padding: "13px" }}
              onClick={reset}
            >
              ← Try again
            </button>
            {result.executable && (
              <button
                className="btn-primary flex-1"
                style={{ padding: "13px" }}
                onClick={() => onConfirm(result)}
              >
                ⚡ Confirm Condition
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
