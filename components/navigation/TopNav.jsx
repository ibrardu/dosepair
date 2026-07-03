import React from "react";

const DEFAULT_LINKS = [
  { id: "home", label: "Home" },
  { id: "analyze", label: "Analyzer" },
  { id: "research", label: "Research" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
];

export function TopNav({ links = DEFAULT_LINKS, active = "home", onNavigate, logoSrc, fixed = false }) {
  return (
    <nav style={{
      position: fixed ? "fixed" : "sticky", top: 0, left: 0, right: 0, zIndex: 50,
      height: "var(--height-nav)",
      display: "flex", alignItems: "center", gap: "var(--space-6)",
      padding: "0 var(--space-5)",
      background: "var(--nav-bg)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-default)",
      fontFamily: "var(--font-body)",
      boxSizing: "border-box",
    }}>
      <span
        onClick={() => onNavigate && onNavigate("home")}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: onNavigate ? "pointer" : "default", flexShrink: 0 }}
      >
        {logoSrc && <img src={logoSrc} alt="" width="24" height="24" style={{ display: "block" }} />}
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "var(--text-md)", color: "var(--text-body)", letterSpacing: "-0.01em",
        }}>DosePair</span>
      </span>
      <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
        {links.map((link) => {
          const isActive = link.id === active;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavigate && onNavigate(link.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                height: "var(--height-nav)", padding: "0 14px",
                fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", fontWeight: 500,
                color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
                borderBottom: `2px solid ${isActive ? "var(--nav-active)" : "transparent"}`,
                marginBottom: -1,
                transition: "color var(--dur-fast) var(--ease-out)",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-body)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-secondary)"; }}
            >{link.label}</button>
          );
        })}
      </div>
    </nav>
  );
}
