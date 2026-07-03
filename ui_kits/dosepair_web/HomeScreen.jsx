import React from "react";

/* DosePair web — Home / Search (route "/"). Google-style: centered lockup,
   pill tag-input, quick combos, recent searches, hero stats. */

const QUICK_COMBOS = [
  ["Warfarin", "Aspirin"],
  ["Metformin", "Lisinopril"],
  ["Atorvastatin", "Amlodipine"],
  ["Sertraline", "Tramadol"],
  ["Omeprazole", "Clopidogrel"],
  ["Levothyroxine", "Calcium"],
];

const SUGGESTIONS = [
  "Aspirin", "Atorvastatin", "Amlodipine", "Amoxicillin", "Calcium",
  "Clopidogrel", "Dovato", "Gabapentin", "Levothyroxine", "Lisinopril",
  "Luteolin", "Metformin", "Omeprazole", "Pregabalin", "Sertraline",
  "Sildenafil", "Tadalafil", "Tramadol", "Warfarin",
];

export function HomeScreen({ onAnalyze, logoSrc }) {
  const { TagInput, Button, Chip } = window.DosePairDesignSystem_7db6c7;
  const [drugs, setDrugs] = React.useState([]);
  const [recent, setRecent] = React.useState([
    ["Dovato", "Tadalafil", "Luteolin"],
    ["Warfarin", "Ibuprofen"],
  ]);

  const run = (names) => { if (names.length) onAnalyze(names); };

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 56px)", overflow: "hidden", fontFamily: "var(--font-body)" }}>
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(rgba(154,160,173,0.14) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 38%, black 20%, transparent 75%)",
        maskImage: "radial-gradient(ellipse 60% 55% at 50% 38%, black 20%, transparent 75%)",
        pointerEvents: "none",
      }}></div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "13vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {logoSrc && <img src={logoSrc} alt="" width="44" height="44" />}
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-2xl)", letterSpacing: "-0.02em", color: "var(--text-body)" }}>DosePair</span>
        </div>
        <p style={{ margin: "10px 0 36px", color: "var(--text-secondary)", fontSize: "var(--text-base)" }}>
          See how your medications interact — before they do.
        </p>

        <TagInput tags={drugs} onChange={setDrugs} suggestions={SUGGESTIONS} onSubmit={run} autoFocus />

        <div style={{ marginTop: 20 }}>
          <Button size="lg" disabled={drugs.length === 0} onClick={() => run(drugs)}>Analyze Interactions</Button>
        </div>

        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 16, alignItems: "center", maxWidth: 720 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)" }}>Quick combos</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {QUICK_COMBOS.map((combo) => (
              <Chip key={combo.join("+")} onClick={() => run(combo)}>{combo.join(" + ")}</Chip>
            ))}
          </div>
          {recent.length > 0 && (
            <React.Fragment>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginTop: 8 }}>Recent searches</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                {recent.map((combo, i) => (
                  <Chip key={combo.join("+")} onClick={() => run(combo)} onRemove={() => setRecent(recent.filter((_, j) => j !== i))}>
                    {combo.join(" + ")}
                  </Chip>
                ))}
              </div>
            </React.Fragment>
          )}
        </div>

        <div style={{ marginTop: 64, display: "flex", gap: 40, color: "var(--text-muted)", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
          <span><strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>12,400+</strong> drugs indexed</span>
          <span><strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>850K+</strong> interactions cached</span>
          <span>Powered by DailyMed + OpenFDA</span>
        </div>
      </div>
    </div>
  );
}
