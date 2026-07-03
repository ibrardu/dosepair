import React from "react";

export function Select({ label, options = [], style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-body)", ...style }}>
      {label && (
        <span style={{
          fontSize: "var(--text-xs)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--text-secondary)",
        }}>{label}</span>
      )}
      <div style={{ position: "relative", display: "flex" }}>
        <select
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            height: "var(--height-input)",
            padding: "0 32px 0 12px",
            width: "100%",
            background: "var(--surface-page)",
            border: `1px solid ${focus ? "var(--border-focus)" : "var(--border-default)"}`,
            borderRadius: "var(--radius-md)",
            color: "var(--text-body)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            outline: "none",
            boxShadow: focus ? "var(--glow-focus)" : "none",
            appearance: "none",
            WebkitAppearance: "none",
            cursor: "pointer",
            transition: "border-color var(--dur-fast) var(--ease-out)",
          }}
          {...rest}
        >
          {options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <span style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", color: "var(--text-secondary)", fontSize: 10,
        }}>▾</span>
      </div>
    </label>
  );
}
