import React from "react";

/* DosePair web — Settings (route "/settings"). */

export function SettingsScreen() {
  const { Card, Input, Switch, Button, Disclaimer } = window.DosePairDesignSystem_7db6c7;
  const [dark, setDark] = React.useState(true);
  const [ownKey, setOwnKey] = React.useState(false);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: "var(--text-lg)", margin: 0 }}>Settings</h1>
      </div>

      <Card title="Connection">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Backend URL" mono defaultValue="https://dosepair.app" hint="Only change this if you self-host DosePair." />
          <Switch checked={ownKey} onChange={setOwnKey} label="Use my own Groq API key" />
          {ownKey && <Input label="Groq API key" mono placeholder="gsk_…" hint="Stored in this browser only; overrides the server key." />}
        </div>
      </Card>

      <Card title="Appearance">
        <div style={{ display: "flex", gap: 32 }}>
          <Switch checked={dark} onChange={setDark} label="Dark theme" />
          <Switch checked={!dark} onChange={(v) => setDark(!v)} label="Follow system" />
        </div>
      </Card>

      <Card title="Data">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Removes all analyses stored under your anonymous session ID. Nothing else is kept.
            </p>
          </div>
          <Button variant="danger" size="sm">Clear history</Button>
        </div>
      </Card>

      <Card title="About">
        <p style={{ margin: "0 0 8px", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          DosePair v3 · drug data from RxNorm, DailyMed, RxNav and OpenFDA · research from PubMed and ClinicalTrials.gov.
        </p>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>session b4f2…91ce · llm: groq → claude haiku fallback</span>
      </Card>

      <Disclaimer />
    </div>
  );
}
