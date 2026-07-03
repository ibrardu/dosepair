import React from "react";

export function Chip({ children, onClick, onRemove, selected = false, style }) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!onClick;
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        height: "var(--height-chip)", padding: onRemove ? "0 8px 0 14px" : "0 14px",
        background: selected ? "var(--tint-blue)" : "var(--surface-card)",
        color: selected ? "var(--accent)" : "var(--text-body)",
        border: `1px solid ${selected ? "rgba(79,142,247,0.4)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", fontWeight: 500,
        cursor: interactive ? "pointer" : "default",
        boxShadow: interactive && hover ? "var(--shadow-lift)" : "none",
        transform: interactive && hover ? "translateY(-1px)" : "none",
        transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), background var(--dur-fast) var(--ease-out)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
      {onRemove && (
        <span
          role="button" aria-label="Dismiss"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            width: 16, height: 16, display: "inline-flex", alignItems: "center",
            justifyContent: "center", borderRadius: "50%", fontSize: 12,
            color: "var(--text-muted)", cursor: "pointer",
          }}
        >×</span>
      )}
    </span>
  );
}
