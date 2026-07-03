import React from "react";

export function Input({
  label,
  hint,
  mono = false,
  style,
  inputStyle,
  ...rest
}) {
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
      <input
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          height: "var(--height-input)",
          padding: "0 12px",
          background: "var(--surface-page)",
          border: `1px solid ${focus ? "var(--border-focus)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-md)",
          color: "var(--text-body)",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          fontSize: "var(--text-base)",
          outline: "none",
          boxShadow: focus ? "var(--glow-focus)" : "none",
          transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
          ...inputStyle,
        }}
        {...rest}
      />
      {hint && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}
