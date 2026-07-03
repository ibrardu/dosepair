import React from "react";

/**
 * Homepage search: pill-shaped tag-input. Confirmed drugs become removable
 * chips inside the field; typing `+` or `,` or Enter confirms the current text.
 */
export function TagInput({
  tags = [],
  onChange,
  placeholder = 'Search drug combinations... e.g. "Warfarin + Aspirin"',
  maxTags = 15,
  suggestions = [],
  onSubmit,
  autoFocus = false,
}) {
  const [text, setText] = React.useState("");
  const [focus, setFocus] = React.useState(false);
  const inputRef = React.useRef(null);

  const confirm = (raw) => {
    const name = raw.trim();
    if (!name || tags.length >= maxTags) return;
    if (tags.some((t) => t.toLowerCase() === name.toLowerCase())) { setText(""); return; }
    onChange && onChange([...tags, name]);
    setText("");
  };

  const handleKey = (e) => {
    if (e.key === "+" || e.key === ",") { e.preventDefault(); confirm(text); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (text.trim()) confirm(text);
      else if (tags.length > 0 && onSubmit) onSubmit(tags);
    } else if (e.key === "Backspace" && !text && tags.length) {
      onChange && onChange(tags.slice(0, -1));
    }
  };

  const matched = text.trim()
    ? suggestions.filter((s) => s.toLowerCase().startsWith(text.trim().toLowerCase())
        && !tags.some((t) => t.toLowerCase() === s.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "var(--width-search-max)", fontFamily: "var(--font-body)" }}>
      <div
        onClick={() => inputRef.current && inputRef.current.focus()}
        style={{
          minHeight: "var(--height-search)",
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
          padding: "8px 20px",
          background: "var(--surface-card)",
          border: `1px solid ${focus ? "var(--border-focus)" : "var(--border-default)"}`,
          borderRadius: "calc(var(--height-search) / 2)",
          boxShadow: focus ? "var(--glow-search)" : "var(--shadow-card)",
          transition: "border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
          cursor: "text",
        }}
      >
        <span aria-hidden="true" style={{ color: "var(--text-secondary)", display: "flex", marginRight: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
        </span>
        {tags.map((tag) => (
          <span key={tag} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            height: 28, padding: "0 6px 0 12px",
            background: "var(--tint-blue)", color: "var(--accent)",
            border: "1px solid rgba(79,142,247,0.35)",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--text-sm)", fontWeight: 500,
          }}>
            {tag}
            <span
              role="button" aria-label={`Remove ${tag}`}
              onClick={(e) => { e.stopPropagation(); onChange && onChange(tags.filter((t) => t !== tag)); }}
              style={{ cursor: "pointer", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 12, color: "var(--text-secondary)" }}
            >×</span>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 120)}
          placeholder={tags.length ? "" : placeholder}
          style={{
            flex: 1, minWidth: 120, border: "none", outline: "none",
            background: "transparent", color: "var(--text-body)",
            fontSize: "var(--text-base)", fontFamily: "var(--font-body)", height: 32,
          }}
        />
      </div>
      {focus && matched.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 16, right: 16, zIndex: 20,
          background: "var(--surface-raised)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lift)", overflow: "hidden",
        }}>
          {matched.map((s) => (
            <div
              key={s}
              onMouseDown={(e) => { e.preventDefault(); confirm(s); }}
              style={{ padding: "10px 16px", fontSize: "var(--text-base)", color: "var(--text-body)", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tint-blue)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}
