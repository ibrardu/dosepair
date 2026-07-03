import React from "react";

export function Switch({ checked = false, onChange, label, disabled = false }) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      fontFamily: "var(--font-body)", fontSize: "var(--text-base)", color: "var(--text-body)",
    }}>
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onChange && onChange(!checked)}
        onKeyDown={(e) => { if (!disabled && (e.key === " " || e.key === "Enter")) { e.preventDefault(); onChange && onChange(!checked); } }}
        style={{
          width: 40, height: 22, borderRadius: "var(--radius-pill)",
          background: checked ? "var(--accent)" : "var(--surface-raised)",
          border: `1px solid ${checked ? "var(--accent)" : "var(--border-default)"}`,
          position: "relative", flexShrink: 0,
          transition: "background var(--dur-base) var(--ease-out)",
          outline: "none",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 19 : 2,
          width: 16, height: 16, borderRadius: "50%",
          background: checked ? "#FFFFFF" : "var(--text-secondary)",
          transition: "left var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)",
        }}></span>
      </span>
      {label}
    </label>
  );
}
