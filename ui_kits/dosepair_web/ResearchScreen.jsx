import React from "react";

/* DosePair web — Research (route "/research"): disease search +
   trials / PubMed / FDA tabs. Mock data, 7-day cache indicator. */

const MOCK = {
  trials: [
    { id: "NCT05451234", title: "Long-acting injectable dolutegravir combinations in virally suppressed adults", phase: "Phase 3", status: "Recruiting", sponsor: "ViiV Healthcare" },
    { id: "NCT05512879", title: "Doravirine/islatravir switch study versus continued ART", phase: "Phase 3", status: "Active, not recruiting", sponsor: "Merck Sharp & Dohme" },
    { id: "NCT05634321", title: "Broadly neutralizing antibody maintenance after ART interruption", phase: "Phase 2", status: "Recruiting", sponsor: "NIAID" },
    { id: "NCT05729984", title: "Weekly oral lenacapavir plus islatravir in treatment-experienced adults", phase: "Phase 2", status: "Enrolling by invitation", sponsor: "Gilead Sciences" },
  ],
  pubmed: [
    { pmid: "38412309", title: "Drug–drug interactions between antiretrovirals and PDE5 inhibitors: a systematic review", journal: "Clin Pharmacokinet", year: 2025 },
    { pmid: "38217745", title: "UGT1A1 polymorphisms and dolutegravir exposure in diverse populations", journal: "Br J Clin Pharmacol", year: 2024 },
    { pmid: "38095512", title: "Flavonoid-mediated CYP3A4 inhibition: clinical relevance of dietary supplements", journal: "Drug Metab Dispos", year: 2024 },
    { pmid: "37956120", title: "Two-drug regimens for HIV-1: durability of dolutegravir/lamivudine at 5 years", journal: "Lancet HIV", year: 2024 },
  ],
  fda: [
    { name: "Lenacapavir (Sunlenca)", date: "2022-12-22", note: "First capsid inhibitor — heavily treatment-experienced adults" },
    { name: "Cabotegravir + rilpivirine LA (Cabenuva)", date: "2021-01-21", note: "First complete long-acting injectable regimen" },
    { name: "Dolutegravir/lamivudine (Dovato)", date: "2019-04-08", note: "First 2-drug complete regimen for treatment-naïve adults" },
  ],
};

export function ResearchScreen({ initialDisease = "HIV" }) {
  const { Input, Button, Tabs, Card, Badge, CacheDot } = window.DosePairDesignSystem_7db6c7;
  const [query, setQuery] = React.useState(initialDisease);
  const [searched, setSearched] = React.useState(initialDisease);
  const [tab, setTab] = React.useState("trials");

  const cardMeta = { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: "var(--text-lg)", margin: 0 }}>Research</h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>Browse clinical trials, papers and FDA approvals for any condition — no medications required.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
        <Input label="Condition / disease" placeholder="e.g. HIV, hypertension, type 2 diabetes" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setSearched(query); }} />
        <Button onClick={() => setSearched(query)} style={{ marginBottom: 1 }}>Search</Button>
      </div>

      {searched && (
        <React.Fragment>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Badge tone="research">{searched}</Badge>
            <CacheDot hit showLabel />
            <span style={cardMeta}>cached 2 days ago · TTL 7 days</span>
            <Button size="sm" variant="ghost" style={{ marginLeft: "auto" }}>Refresh</Button>
          </div>

          <Tabs
            tabs={[
              { id: "trials", label: "Clinical Trials", count: MOCK.trials.length },
              { id: "pubmed", label: "PubMed Papers", count: MOCK.pubmed.length },
              { id: "fda", label: "FDA Approvals", count: MOCK.fda.length },
            ]}
            active={tab} onChange={setTab}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {tab === "trials" && MOCK.trials.map((t) => (
              <Card key={t.id} padding="var(--space-4)">
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Badge tone="research">{t.phase}</Badge>
                  <Badge>{t.status}</Badge>
                </div>
                <p style={{ margin: "0 0 8px", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-body)" }}>{t.title}</p>
                <span style={cardMeta}>{t.id} · {t.sponsor}</span>
              </Card>
            ))}
            {tab === "pubmed" && MOCK.pubmed.map((p) => (
              <Card key={p.pmid} padding="var(--space-4)">
                <p style={{ margin: "0 0 8px", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-body)" }}>{p.title}</p>
                <span style={cardMeta}>{p.journal} · {p.year} · PMID {p.pmid}</span>
              </Card>
            ))}
            {tab === "fda" && MOCK.fda.map((f) => (
              <Card key={f.name} padding="var(--space-4)">
                <p style={{ margin: "0 0 6px", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-body)" }}>{f.name}</p>
                <p style={{ margin: "0 0 8px", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{f.note}</p>
                <span style={cardMeta}>Approved {f.date}</span>
              </Card>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
