import React from "react";

export function Card({ children, title, accent, padding = "var(--space-5)", style }) {
  return (
    <section style={{
      background: "var(--surface-card)",
      border: `1px solid ${accent ? accent : "var(--border-default)"}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-card)",
      padding,
      fontFamily: "var(--font-body)",
      color: "var(--text-body)",
      ...style,
    }}>
      {title && (
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: "var(--text-md)", fontWeight: 600,
          margin: "0 0 var(--space-4) 0", color: "var(--text-body)",
        }}>{title}</h3>
      )}
      {children}
    </section>
  );
}
