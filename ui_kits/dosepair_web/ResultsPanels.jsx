import React from "react";

/* DosePair web — results panels: 24h canvas chart, schedule timeline,
   interaction cards, insights, PK table. Mock visual recreations. */

const PLOTS = ["#4F8EF7", "#C084FC", "#2DD4BF", "#F472B6", "#E09A3A", "#3DBD8A"];
const SEV_COLOR = { high: "rgba(224,92,75,0.12)", moderate: "rgba(224,154,58,0.12)", low: "rgba(61,189,138,0.10)" };

function conc(t, doseHour, halfLife, peakOffset) {
  let dt = t - doseHour;
  if (dt < 0) dt += 24;
  const k = Math.log(2) / halfLife;
  if (dt <= peakOffset) return (dt / peakOffset) * 100;
  return 100 * Math.exp(-k * (dt - peakOffset));
}

export function PlasmaChart({ drugs, windows = [], schedule = [] }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = 280;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const padL = 36, padR = 12, padT = 20, padB = 28;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const x = (h) => padL + (h / 24) * plotW;
    const y = (v) => padT + (1 - v / 110) * plotH;

    ctx.clearRect(0, 0, W, H);

    // Layer 1 — interaction windows
    windows.forEach((w) => {
      ctx.fillStyle = SEV_COLOR[w.severity] || SEV_COLOR.moderate;
      ctx.fillRect(x(w.start), padT, x(w.end) - x(w.start), plotH);
    });

    // grid + hour labels
    ctx.strokeStyle = "#252A3A"; ctx.lineWidth = 1;
    ctx.fillStyle = "#6B7280"; ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.textAlign = "center";
    for (let h = 0; h <= 24; h += 4) {
      ctx.beginPath(); ctx.moveTo(x(h), padT); ctx.lineTo(x(h), padT + plotH); ctx.stroke();
      ctx.fillText(h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? h + "am" : (h - 24 === 0 ? "12am" : (h - 12) + "pm"), x(h), H - 10);
    }

    // Layer 3 — schedule markers (green dashed = recommended, grey = current)
    schedule.forEach((m) => {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = m.recommended ? "#3DBD8A" : "#6B7280";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x(m.hour), padT); ctx.lineTo(x(m.hour), padT + plotH); ctx.stroke();
      ctx.setLineDash([]);
    });

    // curves
    drugs.forEach((d, i) => {
      ctx.strokeStyle = PLOTS[i % PLOTS.length];
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let t = 0; t <= 24; t += 0.1) {
        const v = conc(t, d.doseHour, d.halfLife, d.peakOffset);
        if (t === 0) ctx.moveTo(x(t), y(v)); else ctx.lineTo(x(t), y(v));
      }
      ctx.stroke();

      // Layer 2 — peak annotation
      const peakT = (d.doseHour + d.peakOffset) % 24;
      ctx.fillStyle = PLOTS[i % PLOTS.length];
      ctx.beginPath(); ctx.arc(x(peakT), y(100), 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.textAlign = "left";
      ctx.fillText(d.name + " peak", x(peakT) + 6, y(100) - 4);
    });
  }, [drugs, windows, schedule]);

  return (
    <div>
      <canvas ref={ref} style={{ width: "100%", height: 280, display: "block" }}></canvas>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
        {drugs.map((d, i) => (
          <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: PLOTS[i % PLOTS.length], display: "inline-block" }}></span>
            {d.name}
          </span>
        ))}
        <span style={{ marginLeft: "auto" }}>bands = interaction windows · dashed = schedule</span>
      </div>
    </div>
  );
}

export function InteractionList({ interactions }) {
  const { Card, Badge, CacheDot } = window.DosePairDesignSystem_7db6c7;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {interactions.map((ix) => (
        <Card key={ix.pair.join("-")} padding="var(--space-4) var(--space-5)">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base)", fontWeight: 600 }}>
              {ix.pair[0]} × {ix.pair[1]}
            </strong>
            <Badge tone={ix.severity} />
            <span style={{ marginLeft: "auto" }}><CacheDot hit={ix.cache_hit} showLabel /></span>
          </div>
          <p style={{ margin: "0 0 4px", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>{ix.effect}</p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{ix.mechanism}</p>
        </Card>
      ))}
    </div>
  );
}

export function InsightsList({ insights }) {
  const { Card, Badge, Chip } = window.DosePairDesignSystem_7db6c7;
  const toneOf = { warning: "moderate", tip: "info", info: "neutral" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {insights.map((ins, i) => (
        <Card key={i} padding="var(--space-4) var(--space-5)">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <Badge tone={toneOf[ins.type] || "neutral"}>{ins.type}</Badge>
            {ins.related_drugs.map((d) => <Chip key={d} style={{ height: 24, fontSize: 12 }}>{d}</Chip>)}
          </div>
          <p style={{ margin: "0 0 4px", fontSize: "var(--text-base)", color: "var(--text-body)", fontWeight: 500 }}>{ins.text}</p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Why: {ins.why}</p>
          {ins.actionable && (
            <a href="#schedule" style={{ display: "inline-block", marginTop: 8, fontSize: "var(--text-sm)", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Take action →</a>
          )}
        </Card>
      ))}
    </div>
  );
}

export function ScheduleTimeline({ schedule }) {
  const { Button } = window.DosePairDesignSystem_7db6c7;
  const W = 760, H = 86, padL = 16, padR = 16;
  const x = (h) => padL + (h / 24) * (W - padL - padR);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <line x1={padL} y1={46} x2={W - padR} y2={46} stroke="#252A3A" strokeWidth="2"></line>
        {[0, 6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line x1={x(h)} y1={42} x2={x(h)} y2={50} stroke="#6B7280" strokeWidth="1"></line>
            <text x={x(h)} y={66} fill="#6B7280" fontSize="9" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">
              {h === 0 || h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? h + "am" : (h - 12) + "pm"}
            </text>
          </g>
        ))}
        {schedule.map((s, i) => (
          <g key={s.drug}>
            <circle cx={x(s.hour)} cy={46} r="5" fill="#3DBD8A"></circle>
            <text x={x(s.hour)} y={i % 2 === 0 ? 24 : 36} fill="#E8EAF0" fontSize="10" fontFamily="IBM Plex Sans, sans-serif" textAnchor="middle">
              {s.drug} · {s.time}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Button size="sm" variant="secondary">Export .ics</Button>
        <Button size="sm" variant="secondary">Export PDF</Button>
        <Button size="sm" variant="ghost">Copy schedule</Button>
      </div>
    </div>
  );
}

export function PKTable({ drugs }) {
  const { CacheDot } = window.DosePairDesignSystem_7db6c7;
  const th = { textAlign: "left", padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-default)", fontWeight: 500 };
  const td = { padding: "10px 12px", fontSize: "var(--text-sm)", color: "var(--text-body)", borderBottom: "1px solid var(--border-default)" };
  const mono = { ...td, fontFamily: "var(--font-mono)" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Drug</th><th style={th}>RxCUI</th><th style={th}>Dose time</th>
            <th style={th}>Half-life</th><th style={th}>Peak</th><th style={th}>Route</th>
            <th style={th}>Metabolism</th><th style={th}>Source</th><th style={th}>Cache</th>
          </tr>
        </thead>
        <tbody>
          {drugs.map((d) => (
            <tr key={d.name}>
              <td style={{ ...td, fontWeight: 500 }}>{d.name}</td>
              <td style={mono}>{d.rxcui}</td>
              <td style={mono}>{d.time}</td>
              <td style={mono}>{d.halfLife}h</td>
              <td style={mono}>+{d.peakOffset}h</td>
              <td style={td}>{d.route}</td>
              <td style={{ ...td, color: "var(--text-secondary)" }}>{d.metabolism}</td>
              <td style={mono}>{d.pk_source}</td>
              <td style={td}><CacheDot hit={d.cache_hit} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
