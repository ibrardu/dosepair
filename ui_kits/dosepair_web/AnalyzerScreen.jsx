import React from "react";

/* DosePair web — Analyzer (route "/analyze"): structured medication rows +
   disease field, inline results below. Mock pipeline, no network. */

const PK_DB = {
  Warfarin:      { rxcui: "11289",  halfLife: 40,  peakOffset: 4,   metabolism: "CYP2C9",            route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Aspirin:       { rxcui: "1191",   halfLife: 6,   peakOffset: 1,   metabolism: "Hepatic esterases", route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Dovato:        { rxcui: "2375961",halfLife: 14,  peakOffset: 1.5, metabolism: "UGT1A1 85%, CYP3A4 12%", route: "oral", cache_hit: true, pk_source: "dailymed" },
  Tadalafil:     { rxcui: "358263", halfLife: 17.5,peakOffset: 2,   metabolism: "CYP3A4 primary",    route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Luteolin:      { rxcui: "—",      halfLife: 5,   peakOffset: 1,   metabolism: "CYP3A4 inhibitor",  route: "oral", cache_hit: false, pk_source: "llm" },
  Metformin:     { rxcui: "6809",   halfLife: 6.2, peakOffset: 2.5, metabolism: "Renal, unchanged",  route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Lisinopril:    { rxcui: "29046",  halfLife: 12,  peakOffset: 6,   metabolism: "Renal, unchanged",  route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Atorvastatin:  { rxcui: "83367",  halfLife: 14,  peakOffset: 1.5, metabolism: "CYP3A4",            route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Amlodipine:    { rxcui: "17767",  halfLife: 40,  peakOffset: 7,   metabolism: "CYP3A4",            route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Sertraline:    { rxcui: "36437",  halfLife: 26,  peakOffset: 5,   metabolism: "CYP2D6, CYP2C19",   route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Tramadol:      { rxcui: "10689",  halfLife: 6.3, peakOffset: 2,   metabolism: "CYP2D6, CYP3A4",    route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Omeprazole:    { rxcui: "7646",   halfLife: 1,   peakOffset: 1,   metabolism: "CYP2C19",           route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Clopidogrel:   { rxcui: "32968",  halfLife: 6,   peakOffset: 1,   metabolism: "CYP2C19 (prodrug)", route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Levothyroxine: { rxcui: "10582",  halfLife: 168, peakOffset: 2,   metabolism: "Deiodination",      route: "oral", cache_hit: true,  pk_source: "dailymed" },
  Calcium:       { rxcui: "1897",   halfLife: 4,   peakOffset: 2,   metabolism: "None (mineral)",    route: "oral", cache_hit: true,  pk_source: "openfda" },
  Ibuprofen:     { rxcui: "5640",   halfLife: 2,   peakOffset: 1.5, metabolism: "CYP2C9",            route: "oral", cache_hit: true,  pk_source: "dailymed" },
};

const IX_DB = [
  { pair: ["Warfarin", "Aspirin"], severity: "high", cache_hit: true, source: "rxnav",
    effect: "Significantly increased bleeding risk — additive anticoagulant and antiplatelet effects.",
    mechanism: "Aspirin inhibits platelet aggregation while warfarin blocks vitamin-K-dependent clotting factors; aspirin also displaces warfarin from plasma proteins." },
  { pair: ["Warfarin", "Ibuprofen"], severity: "high", cache_hit: true, source: "rxnav",
    effect: "NSAIDs with warfarin sharply raise GI bleeding risk.",
    mechanism: "COX inhibition impairs platelet function and gastric protection on top of anticoagulation." },
  { pair: ["Sertraline", "Tramadol"], severity: "high", cache_hit: true, source: "rxnav",
    effect: "Risk of serotonin syndrome and lowered seizure threshold.",
    mechanism: "Both agents increase synaptic serotonin; tramadol's metabolite adds μ-opioid and SNRI activity via CYP2D6 competition." },
  { pair: ["Omeprazole", "Clopidogrel"], severity: "moderate", cache_hit: true, source: "rxnav",
    effect: "Reduced antiplatelet effect of clopidogrel.",
    mechanism: "Omeprazole inhibits CYP2C19, which activates the clopidogrel prodrug." },
  { pair: ["Levothyroxine", "Calcium"], severity: "moderate", cache_hit: true, source: "rxnav",
    effect: "Reduced levothyroxine absorption when taken together.",
    mechanism: "Calcium binds levothyroxine in the gut; separate doses by at least 4 hours." },
  { pair: ["Tadalafil", "Luteolin"], severity: "moderate", cache_hit: false, source: "llm",
    effect: "Possible increased tadalafil exposure and prolonged effect.",
    mechanism: "Luteolin moderately inhibits CYP3A4, the primary clearance pathway for tadalafil." },
  { pair: ["Atorvastatin", "Amlodipine"], severity: "moderate", cache_hit: true, source: "rxnav",
    effect: "Modestly increased statin exposure; monitor for myopathy.",
    mechanism: "Amlodipine weakly inhibits CYP3A4-mediated atorvastatin clearance." },
  { pair: ["Metformin", "Lisinopril"], severity: "low", cache_hit: true, source: "rxnav",
    effect: "Generally safe; small additive effect on blood glucose.",
    mechanism: "ACE inhibitors can mildly enhance insulin sensitivity." },
];

const DEFAULT_HOURS = [8, 10, 13, 18, 21];

function buildResult(meds, disease) {
  const drugs = meds.map((m, i) => {
    const pk = PK_DB[m.name] || { rxcui: "—", halfLife: 8, peakOffset: 2, metabolism: "Unknown — LLM estimated", route: m.route || "oral", cache_hit: false, pk_source: "llm" };
    const doseHour = m.hour !== undefined ? m.hour : DEFAULT_HOURS[i % DEFAULT_HOURS.length];
    return { name: m.name, time: m.time || (doseHour <= 12 ? doseHour + "am" : (doseHour - 12) + "pm"), doseHour, dose: m.dose, route: m.route || pk.route, ...pk };
  });

  const names = drugs.map((d) => d.name);
  const interactions = IX_DB.filter((ix) => ix.pair.every((p) => names.includes(p)));
  const order = { high: 0, moderate: 1, low: 2 };
  interactions.sort((a, b) => order[a.severity] - order[b.severity]);

  const insights = [];
  interactions.forEach((ix) => {
    if (ix.severity === "high") insights.push({ type: "warning", text: `Avoid combining ${ix.pair[0]} and ${ix.pair[1]} without clinical supervision.`, why: ix.mechanism, related_drugs: ix.pair, actionable: false });
    else if (ix.severity === "moderate") insights.push({ type: "tip", text: `Separate ${ix.pair[0]} and ${ix.pair[1]} doses to reduce peak overlap.`, why: ix.mechanism, related_drugs: ix.pair, actionable: true });
  });
  insights.push({ type: "info", text: `${drugs.filter((d) => d.cache_hit).length} of ${drugs.length} drugs served from cache.`, why: "Cached pharmacokinetic data skips live DailyMed fetches, making analysis faster and cheaper.", related_drugs: [], actionable: false });

  const schedule = drugs.map((d, i) => {
    const hour = Math.max(6, Math.min(22, 7 + i * Math.max(2, Math.round(12 / drugs.length))));
    return { drug: d.name, hour, time: hour <= 12 ? hour + "am" : (hour - 12) + "pm", recommended: true };
  });

  const windows = interactions.slice(0, 2).map((ix) => {
    const a = drugs.find((d) => d.name === ix.pair[0]);
    const b = drugs.find((d) => d.name === ix.pair[1]);
    const start = Math.min(a.doseHour, b.doseHour);
    return { start, end: Math.min(24, start + 4), severity: ix.severity };
  });

  const worst = interactions[0] ? interactions[0].severity : null;
  const summary = interactions.length
    ? `Found ${interactions.length} interaction${interactions.length > 1 ? "s" : ""} across ${drugs.length} medications — worst severity ${worst}. ${insights.find((i) => i.actionable) ? "Timing adjustments below can reduce peak overlap." : "Review the cards below before making any changes."}`
    : `No known interactions found across ${drugs.length} medication${drugs.length > 1 ? "s" : ""}. Pharmacokinetic profiles and an optimized schedule are shown below.`;

  const allKnown = drugs.every((d) => d.pk_source !== "llm");
  return { drugs, interactions, insights, schedule, windows, summary, llm_source: allKnown ? "groq" : "claude haiku", disease };
}

export function AnalyzerScreen({ initialDrugs = [] }) {
  const { Button, Input, Select, Card, Badge, Disclaimer } = window.DosePairDesignSystem_7db6c7;
  const { PlasmaChart, InteractionList, InsightsList, ScheduleTimeline, PKTable } = window.DosePairDesignSystem_7db6c7;

  const mkRow = (name = "", i = 0) => ({ name, dose: "", time: "", route: "oral", key: name + "-" + i + "-" + Math.random().toString(36).slice(2, 7) });
  const [rows, setRows] = React.useState(() =>
    initialDrugs.length ? initialDrugs.map(mkRow) : [mkRow("Dovato", 0), mkRow("Tadalafil", 1)]
  );
  const [disease, setDisease] = React.useState("");
  const [result, setResult] = React.useState(() =>
    initialDrugs.length ? buildResult(initialDrugs.map((n) => ({ name: n })), "") : null
  );
  const [loading, setLoading] = React.useState(false);

  const setRow = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const analyze = () => {
    const meds = rows.filter((r) => r.name.trim());
    if (!meds.length) return;
    setLoading(true);
    setTimeout(() => { setResult(buildResult(meds, disease.trim())); setLoading(false); }, 600);
  };

  const label = { fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)" };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: "var(--text-lg)", margin: 0 }}>Analyzer</h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>Enter each medication with dose, time and route. Add a condition to include disease research.</p>
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((row, i) => (
            <div key={row.key} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <Input label={i === 0 ? "Medication" : undefined} placeholder="e.g. Tadalafil" value={row.name} onChange={(e) => setRow(i, { name: e.target.value })} />
              <Input label={i === 0 ? "Dose" : undefined} placeholder="5mg" mono value={row.dose} onChange={(e) => setRow(i, { dose: e.target.value })} />
              <Input label={i === 0 ? "Time" : undefined} placeholder="8am" mono value={row.time} onChange={(e) => setRow(i, { time: e.target.value })} />
              <Select label={i === 0 ? "Route" : undefined} options={["oral", "topical", "injection", "inhaled"]} value={row.route} onChange={(e) => setRow(i, { route: e.target.value })} />
              <Button variant="ghost" size="sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove row" style={{ marginBottom: 4 }}>×</Button>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <Input label="Disease / condition (optional)" placeholder="e.g. HIV" value={disease} onChange={(e) => setDisease(e.target.value)} hint="Unlocks the clinical research panel" />
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              <Button variant="secondary" size="md" disabled={rows.length >= 15} onClick={() => setRows([...rows, mkRow("", rows.length)])}>+ Add medication</Button>
              <Button onClick={analyze} disabled={loading}>{loading ? "Analyzing…" : "Analyze Interactions"}</Button>
            </div>
          </div>
        </div>
      </Card>

      {result && !loading && (
        <React.Fragment>
          <Card title="Summary">
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <Badge tone="info">{result.llm_source}</Badge>
              <Badge>{result.drugs.filter((d) => d.cache_hit).length}/{result.drugs.length} cache hits</Badge>
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-body)" }}>{result.summary}</p>
          </Card>

          <Card title="24-hour plasma levels">
            <PlasmaChart drugs={result.drugs} windows={result.windows} schedule={result.schedule} />
          </Card>

          {result.interactions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={label}>Interactions · {result.interactions.length}</span>
              <InteractionList interactions={result.interactions} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={label}>Insights</span>
            <InsightsList insights={result.insights} />
          </div>

          <Card title="Recommended schedule" id="schedule">
            <ScheduleTimeline schedule={result.schedule} />
          </Card>

          <Card title="Pharmacokinetics">
            <PKTable drugs={result.drugs} />
          </Card>

          <Disclaimer />
        </React.Fragment>
      )}

      {loading && (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
            Checking drug_cache → fetching PK data → routing to LLM…
          </p>
        </Card>
      )}
    </div>
  );
}
