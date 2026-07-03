/* DosePair plasma chart engine — Bateman PK curves, Gaussian smoothing,
   bezier rendering, hover crosshair + tooltip support.
   Pure canvas-2D, no React. Exposed as window.DosePairChart. */
(function () {
  // ───── PK math: Bateman one-compartment model ─────
  // Smooth bell curve from absorption + elimination kinetics.
  // Half-life → elimination rate (ke). Peak time → absorption rate (ka).
  // Circular modulo handles the 0/24h boundary seamlessly.
  function conc(t, doseH, hl, peak) {
    let dt = ((t - doseH) % 24 + 24) % 24;
    const ke = Math.log(2) / Math.max(hl, 0.1);
    let ka = 3.0 / Math.max(peak, 0.3);
    if (Math.abs(ka - ke) < 0.001) ka = ke + 0.01;
    const raw = Math.exp(-ke * dt) - Math.exp(-ka * dt);
    if (raw <= 0) return 0;
    const tPeak = Math.log(ka / ke) / (ka - ke);
    const maxRaw = Math.exp(-ke * tPeak) - Math.exp(-ka * tPeak);
    return Math.max(0, 100 * raw / maxRaw);
  }

  // Light Gaussian smoothing pass over sampled values (removes residual wiggles)
  function gaussianSmooth(values, sigma) {
    if (sigma <= 0) return values.slice();
    const radius = Math.ceil(sigma * 3);
    const kernel = [];
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const w = Math.exp(-(i * i) / (2 * sigma * sigma));
      kernel.push(w);
      sum += w;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
    return values.map((_, i) => {
      let acc = 0;
      for (let j = -radius; j <= radius; j++) {
        const idx = Math.max(0, Math.min(values.length - 1, i + j));
        acc += values[idx] * kernel[j + radius];
      }
      return acc;
    });
  }

  function samplePoints(drug, samples) {
    samples = samples || 240;
    const vals = [];
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * 24;
      vals.push(conc(t, drug.doseH, drug.hl, drug.pk));
    }
    return gaussianSmooth(vals, 1.0);
  }

  function getCssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function getPadding(compact) {
    return {
      pL: compact ? 28 : 44,
      pR: compact ? 12 : 16,
      pT: compact ? 22 : 28,
      pB: compact ? 26 : 32,
    };
  }

  function drawChart(canvas, drugs, opts) {
    opts = opts || {};
    const windows = opts.windows || [];
    const hoverT  = opts.hoverT != null ? opts.hoverT : null;
    const compact = !!opts.compact;
    const H = opts.height || (compact ? 180 : 280);

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const pad = getPadding(compact);
    const pw = W - pad.pL - pad.pR;
    const ph = H - pad.pT - pad.pB;
    const cx = h => pad.pL + (h / 24) * pw;
    const cy = v => pad.pT + (1 - v / 110) * ph;

    const SEV_BG = {
      high:     'rgba(197, 48,  48,  0.10)',
      moderate: 'rgba(180, 83,  9,   0.10)',
      low:      'rgba(21,  128, 61,  0.10)',
    };
    const SEV_STRIPE = {
      high:     'rgba(197, 48,  48,  0.65)',
      moderate: 'rgba(180, 83,  9,   0.60)',
      low:      'rgba(21,  128, 61,  0.55)',
    };

    const borderCol = getCssVar('--ms-border', '#252A3A');
    const mutedCol  = getCssVar('--ms-text-3', '#6B7280');
    const surfCol   = getCssVar('--ms-bg', '#0F1117');

    ctx.clearRect(0, 0, W, H);

    // ── 1. Interaction window fills + top stripe accent ──
    windows.forEach(function (w) {
      const x = cx(w.start);
      const wpx = cx(w.end) - x;
      ctx.fillStyle = SEV_BG[w.severity] || SEV_BG.moderate;
      ctx.fillRect(x, pad.pT, wpx, ph);
      ctx.fillStyle = SEV_STRIPE[w.severity] || SEV_STRIPE.moderate;
      ctx.fillRect(x, pad.pT, wpx, 3);
    });

    // ── 2. Minor grid every 3h ──
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.35;
    for (let h = 3; h < 24; h += 3) {
      if (h % 6 === 0) continue;
      ctx.beginPath();
      ctx.moveTo(cx(h), pad.pT);
      ctx.lineTo(cx(h), pad.pT + ph);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── 3. Major grid every 6h + time labels ──
    ctx.lineWidth = 1;
    ctx.fillStyle = mutedCol;
    ctx.font = (compact ? "9px" : "10px") + " 'JetBrains Mono', 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    for (let h = 0; h <= 24; h += 6) {
      ctx.beginPath();
      ctx.moveTo(cx(h), pad.pT);
      ctx.lineTo(cx(h), pad.pT + ph);
      ctx.stroke();
      const lbl = h === 0 || h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? h + "am" : (h - 12) + "pm";
      ctx.fillText(lbl, cx(h), H - (compact ? 8 : 12));
    }

    // ── 4. Y-axis labels (0, 50, 100) ──
    ctx.textAlign = "right";
    [0, 50, 100].forEach(function (v) {
      ctx.fillStyle = mutedCol;
      ctx.fillText(v, pad.pL - 6, cy(v) + 3);
    });

    // ── 5. Sample + smooth each curve ──
    const samples = 240;
    const curves = drugs.map(function (d) {
      return { drug: d, values: samplePoints(d, samples) };
    });

    // ── 6. Area fills (semi-transparent gradient under each curve) ──
    curves.forEach(function (c) {
      const grad = ctx.createLinearGradient(0, pad.pT, 0, pad.pT + ph);
      grad.addColorStop(0, c.drug.color + '30');
      grad.addColorStop(1, c.drug.color + '06');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const pts = c.values.map(function (v, i) { return { x: cx(i / samples * 24), y: cy(v) }; });
      ctx.moveTo(pts[0].x, pad.pT + ph);
      ctx.lineTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.lineTo(pts[pts.length - 1].x, pad.pT + ph);
      ctx.closePath();
      ctx.fill();
    });

    // ── 7. Stroke each curve with bezier smoothing ──
    curves.forEach(function (c) {
      ctx.strokeStyle = c.drug.color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.lineCap  = "round";
      ctx.beginPath();
      const pts = c.values.map(function (v, i) { return { x: cx(i / samples * 24), y: cy(v) }; });
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    });

    // ── 8. Triangle dose markers at top edge ──
    drugs.forEach(function (d) {
      const x = cx(d.doseH);
      const triH = compact ? 5 : 7;
      const triW = compact ? 6 : 8;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.moveTo(x, pad.pT - 1);
      ctx.lineTo(x - triW / 2, pad.pT - 1 - triH);
      ctx.lineTo(x + triW / 2, pad.pT - 1 - triH);
      ctx.closePath();
      ctx.fill();
    });

    // ── 9. Hover crosshair + dots ──
    if (hoverT !== null && hoverT >= 0 && hoverT <= 24) {
      const x = cx(hoverT);
      ctx.strokeStyle = mutedCol;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, pad.pT);
      ctx.lineTo(x, pad.pT + ph);
      ctx.stroke();
      ctx.setLineDash([]);
      drugs.forEach(function (d) {
        const v = conc(hoverT, d.doseH, d.hl, d.pk);
        const y = cy(v);
        ctx.fillStyle = surfCol;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function xToTime(canvas, mouseX, opts) {
    opts = opts || {};
    const compact = !!opts.compact;
    const pad = getPadding(compact);
    const W = canvas.clientWidth;
    const pw = W - pad.pL - pad.pR;
    const t = ((mouseX - pad.pL) / pw) * 24;
    return Math.max(0, Math.min(24, t));
  }

  function getHoverData(drugs, hoverT) {
    return drugs
      .map(function (d) { return { name: d.name, color: d.color, value: conc(hoverT, d.doseH, d.hl, d.pk) }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  function formatTime(t) {
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    const hh = h === 0 ? 12 : h <= 12 ? h : h - 12;
    const ap = h < 12 ? "am" : "pm";
    return hh + ":" + String(m).padStart(2, "0") + ap;
  }

  window.DosePairChart = { drawChart: drawChart, xToTime: xToTime, getHoverData: getHoverData, formatTime: formatTime, conc: conc };
})();
