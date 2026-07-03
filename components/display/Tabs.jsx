import React from "react";

export function Tabs({ tabs = [], active, onChange, style }) {
  return (
    <div role="tablist" style={{
      display: "flex", gap: 4,
      borderBottom: "1px solid var(--border-default)",
      fontFamily: "var(--font-body)",
      ...style,
    }}>
      {tabs.map((tab) => {
        const t = typeof tab === "string" ? { id: tab, label: tab } : tab;
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange && onChange(t.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 14px", marginBottom: -1,
              fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", fontWeight: 500,
              color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
              borderBottom: `2px solid ${isActive ? "var(--nav-active)" : "transparent"}`,
              transition: "color var(--dur-fast) var(--ease-out)",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                background: isActive ? "var(--tint-blue)" : "var(--surface-raised)",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                borderRadius: "var(--radius-sm)", padding: "1px 6px",
              }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
