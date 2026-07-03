import React from "react";

/* DosePair web — History (route "/history"): session-scoped past analyses. */

const MOCK_HISTORY = [
  { ts: "Today, 9:42am", drugs: ["Dovato", "Tadalafil", "Luteolin"], worst: "moderate", llm: "claude haiku" },
  { ts: "Today, 8:15am", drugs: ["Warfarin", "Aspirin"], worst: "high", llm: "groq" },
  { ts: "Yesterday, 10:03pm", drugs: ["Sertraline", "Tramadol"], worst: "high", llm: "groq" },
  { ts: "Yesterday, 2:31pm", drugs: ["Metformin", "Lisinopril"], worst: "low", llm: "groq" },
  { ts: "Jun 7, 11:20am", drugs: ["Levothyroxine", "Calcium"], worst: "moderate", llm: "groq" },
];

export function HistoryScreen({ onReanalyze }) {
  const { Card, Badge, Chip, Button } = window.DosePairDesignSystem_7db6c7;
  const [items, setItems] = React.useState(MOCK_HISTORY);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "end", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "var(--text-lg)", margin: 0 }}>History</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
            Analyses from this session, stored locally. <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>session b4f2…91ce</span>
          </p>
        </div>
        {items.length > 0 && <Button variant="danger" size="sm" onClick={() => setItems([])}>Clear history</Button>}
      </div>

      {items.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "var(--space-7)" }}>
          <p style={{ margin: "0 0 4px", fontWeight: 500 }}>No analyses yet</p>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>Run a search from the home page and it will appear here.</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((h, i) => (
            <Card key={i} padding="var(--space-3) var(--space-4)">
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", width: 140, flexShrink: 0 }}>{h.ts}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                  {h.drugs.map((d) => <Chip key={d} style={{ height: 24, fontSize: 12 }}>{d}</Chip>)}
                </div>
                <Badge tone={h.worst} />
                <Badge tone="info">{h.llm}</Badge>
                <Button size="sm" variant="secondary" onClick={() => onReanalyze && onReanalyze(h.drugs)}>Re-analyze</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
