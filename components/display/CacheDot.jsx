import React from "react";

export function CacheDot({ hit = false, showLabel = false }) {
  return (
    <span title={hit ? "Served from cache" : "Fetched live"} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: hit ? "var(--cache-hit)" : "var(--cache-miss)",
        boxShadow: hit ? "0 0 6px rgba(61,189,138,0.6)" : "none",
        flexShrink: 0,
      }}></span>
      {showLabel && (hit ? "cache hit" : "live fetch")}
    </span>
  );
}
