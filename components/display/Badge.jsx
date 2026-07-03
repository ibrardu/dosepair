import React from "react";

const TONES = {
  high:     { fg: "var(--severity-high)",     bg: "var(--tint-red)",    label: "High" },
  moderate: { fg: "var(--severity-moderate)", bg: "var(--tint-amber)",  label: "Moderate" },
  low:      { fg: "var(--severity-low)",      bg: "var(--tint-green)",  label: "Low" },
  info:     { fg: "var(--accent)",            bg: "var(--tint-blue)",   label: "Info" },
  research: { fg: "var(--research)",          bg: "var(--tint-teal)",   label: "Research" },
  neutral:  { fg: "var(--text-secondary)",    bg: "var(--surface-raised)", label: "" },
};

export function Badge({ tone = "neutral", children, style }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 22, padding: "0 10px",
      borderRadius: "var(--radius-sm)",
      background: t.bg, color: t.fg,
      fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 500,
      textTransform: "uppercase", letterSpacing: "var(--tracking-caps)",
      whiteSpace: "nowrap",
      ...style,
    }}>
      {children !== undefined && children !== null ? children : t.label}
    </span>
  );
}
