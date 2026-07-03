import React from "react";

export function Disclaimer({ children, style }) {
  return (
    <aside role="note" style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "var(--space-4) var(--space-5)",
      background: "var(--tint-amber)",
      border: "1px solid rgba(224, 154, 58, 0.45)",
      borderRadius: "var(--radius-lg)",
      fontFamily: "var(--font-body)", fontSize: "var(--text-sm)",
      color: "var(--text-secondary)", lineHeight: "var(--leading-body)",
      ...style,
    }}>
      <span aria-hidden="true" style={{ color: "var(--severity-moderate)", flexShrink: 0, display: "flex", marginTop: 2 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
      </span>
      <span>
        {children || (
          <React.Fragment>
            <strong style={{ color: "var(--severity-moderate)", fontWeight: 600 }}>Not medical advice.</strong>{" "}
            DosePair is an informational tool. Interaction analyses are generated from public drug databases and AI reasoning, and may be incomplete or incorrect. Always confirm medication changes with your doctor or pharmacist.
          </React.Fragment>
        )}
      </span>
    </aside>
  );
}
