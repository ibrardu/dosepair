/* @ds-bundle: {"format":3,"namespace":"DosePairDesignSystem_7db6c7","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"CacheDot","sourcePath":"components/display/CacheDot.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Chip","sourcePath":"components/display/Chip.jsx"},{"name":"Tabs","sourcePath":"components/display/Tabs.jsx"},{"name":"Disclaimer","sourcePath":"components/feedback/Disclaimer.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"TagInput","sourcePath":"components/forms/TagInput.jsx"},{"name":"TopNav","sourcePath":"components/navigation/TopNav.jsx"},{"name":"AnalyzerScreen","sourcePath":"ui_kits/dosepair_web/AnalyzerScreen.jsx"},{"name":"HistoryScreen","sourcePath":"ui_kits/dosepair_web/HistoryScreen.jsx"},{"name":"HomeScreen","sourcePath":"ui_kits/dosepair_web/HomeScreen.jsx"},{"name":"ResearchScreen","sourcePath":"ui_kits/dosepair_web/ResearchScreen.jsx"},{"name":"PlasmaChart","sourcePath":"ui_kits/dosepair_web/ResultsPanels.jsx"},{"name":"InteractionList","sourcePath":"ui_kits/dosepair_web/ResultsPanels.jsx"},{"name":"InsightsList","sourcePath":"ui_kits/dosepair_web/ResultsPanels.jsx"},{"name":"ScheduleTimeline","sourcePath":"ui_kits/dosepair_web/ResultsPanels.jsx"},{"name":"PKTable","sourcePath":"ui_kits/dosepair_web/ResultsPanels.jsx"},{"name":"SettingsScreen","sourcePath":"ui_kits/dosepair_web/SettingsScreen.jsx"}],"sourceHashes":{"assets/dosepair-chart.js":"191be10f57f7","components/actions/Button.jsx":"ec4eb47e4177","components/display/Badge.jsx":"0c2aa275421b","components/display/CacheDot.jsx":"a8bce2d5e307","components/display/Card.jsx":"af5d9d94b305","components/display/Chip.jsx":"223d236e0fb2","components/display/Tabs.jsx":"1578e9f095a2","components/feedback/Disclaimer.jsx":"09c5dee4e72f","components/forms/Input.jsx":"a9dc1d463f71","components/forms/Select.jsx":"1f0eafd60e64","components/forms/Switch.jsx":"73caedbd061d","components/forms/TagInput.jsx":"65f5221d51de","components/navigation/TopNav.jsx":"3aaac0e4d7dd","tweaks-panel.jsx":"6591467622ed","ui_kits/dosepair_android/android-frame.jsx":"70c8c3059eeb","ui_kits/dosepair_ios/ios-frame.jsx":"be3343be4b51","ui_kits/dosepair_web/AnalyzerScreen.jsx":"cbd1c4862c26","ui_kits/dosepair_web/HistoryScreen.jsx":"fce409b32de3","ui_kits/dosepair_web/HomeScreen.jsx":"a3339a41f3f5","ui_kits/dosepair_web/ResearchScreen.jsx":"638994ef66d3","ui_kits/dosepair_web/ResultsPanels.jsx":"e60de0dc3d79","ui_kits/dosepair_web/SettingsScreen.jsx":"5f9349c00259"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DosePairDesignSystem_7db6c7 = window.DosePairDesignSystem_7db6c7 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/dosepair-chart.js
try { (() => {
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
      const t = i / samples * 24;
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
      pB: compact ? 26 : 32
    };
  }
  function drawChart(canvas, drugs, opts) {
    opts = opts || {};
    const windows = opts.windows || [];
    const hoverT = opts.hoverT != null ? opts.hoverT : null;
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
    const cx = h => pad.pL + h / 24 * pw;
    const cy = v => pad.pT + (1 - v / 110) * ph;
    const SEV_BG = {
      high: 'rgba(197, 48,  48,  0.10)',
      moderate: 'rgba(180, 83,  9,   0.10)',
      low: 'rgba(21,  128, 61,  0.10)'
    };
    const SEV_STRIPE = {
      high: 'rgba(197, 48,  48,  0.65)',
      moderate: 'rgba(180, 83,  9,   0.60)',
      low: 'rgba(21,  128, 61,  0.55)'
    };
    const borderCol = getCssVar('--ms-border', '#252A3A');
    const mutedCol = getCssVar('--ms-text-3', '#6B7280');
    const surfCol = getCssVar('--ms-bg', '#0F1117');
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
      const lbl = h === 0 || h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? h + "am" : h - 12 + "pm";
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
      return {
        drug: d,
        values: samplePoints(d, samples)
      };
    });

    // ── 6. Area fills (semi-transparent gradient under each curve) ──
    curves.forEach(function (c) {
      const grad = ctx.createLinearGradient(0, pad.pT, 0, pad.pT + ph);
      grad.addColorStop(0, c.drug.color + '30');
      grad.addColorStop(1, c.drug.color + '06');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const pts = c.values.map(function (v, i) {
        return {
          x: cx(i / samples * 24),
          y: cy(v)
        };
      });
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
      ctx.lineCap = "round";
      ctx.beginPath();
      const pts = c.values.map(function (v, i) {
        return {
          x: cx(i / samples * 24),
          y: cy(v)
        };
      });
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
    const t = (mouseX - pad.pL) / pw * 24;
    return Math.max(0, Math.min(24, t));
  }
  function getHoverData(drugs, hoverT) {
    return drugs.map(function (d) {
      return {
        name: d.name,
        color: d.color,
        value: conc(hoverT, d.doseH, d.hl, d.pk)
      };
    }).sort(function (a, b) {
      return b.value - a.value;
    });
  }
  function formatTime(t) {
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    const hh = h === 0 ? 12 : h <= 12 ? h : h - 12;
    const ap = h < 12 ? "am" : "pm";
    return hh + ":" + String(m).padStart(2, "0") + ap;
  }
  window.DosePairChart = {
    drawChart: drawChart,
    xToTime: xToTime,
    getHoverData: getHoverData,
    formatTime: formatTime,
    conc: conc
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/dosepair-chart.js", error: String((e && e.message) || e) }); }

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANTS = {
  primary: {
    base: {
      background: "var(--accent)",
      color: "var(--accent-on, #FFFFFF)",
      border: "1px solid transparent"
    },
    hover: {
      background: "var(--accent-hover)"
    },
    press: {
      background: "var(--accent-press)"
    }
  },
  secondary: {
    base: {
      background: "var(--surface-card)",
      color: "var(--text-body)",
      border: "1px solid var(--border-default)"
    },
    hover: {
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong, var(--border-default))"
    },
    press: {
      background: "var(--surface-raised)"
    }
  },
  ghost: {
    base: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid transparent"
    },
    hover: {
      background: "var(--tint-ink, var(--surface-raised))",
      color: "var(--text-body)"
    },
    press: {
      background: "var(--surface-raised)"
    }
  },
  danger: {
    base: {
      background: "var(--tint-red)",
      color: "var(--severity-high)",
      border: "1px solid var(--severity-high)"
    },
    hover: {
      background: "var(--severity-high)",
      color: "var(--accent-on, #FFFFFF)"
    },
    press: {
      background: "var(--severity-high)",
      color: "var(--accent-on, #FFFFFF)"
    }
  }
};
const SIZES = {
  sm: {
    height: 32,
    padding: "0 12px",
    fontSize: "var(--text-sm)"
  },
  md: {
    height: "var(--height-button)",
    padding: "0 20px",
    fontSize: "var(--text-base)"
  },
  lg: {
    height: 48,
    padding: "0 28px",
    fontSize: "var(--text-md)"
  }
};
function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  icon = null,
  onClick,
  style,
  ...rest
}) {
  const [state, setState] = React.useState("base");
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const stateStyle = state === "press" ? {
    ...v.hover,
    ...v.press
  } : state === "hover" ? v.hover : {};
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setState("hover"),
    onMouseLeave: () => setState("base"),
    onMouseDown: () => setState("press"),
    onMouseUp: () => setState("hover"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontFamily: "var(--font-body)",
      fontWeight: 500,
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      width: fullWidth ? "100%" : undefined,
      transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
      whiteSpace: "nowrap",
      ...s,
      ...v.base,
      ...(disabled ? {} : stateStyle),
      ...style
    }
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
const TONES = {
  high: {
    fg: "var(--severity-high)",
    bg: "var(--tint-red)",
    label: "High"
  },
  moderate: {
    fg: "var(--severity-moderate)",
    bg: "var(--tint-amber)",
    label: "Moderate"
  },
  low: {
    fg: "var(--severity-low)",
    bg: "var(--tint-green)",
    label: "Low"
  },
  info: {
    fg: "var(--accent)",
    bg: "var(--tint-blue)",
    label: "Info"
  },
  research: {
    fg: "var(--research)",
    bg: "var(--tint-teal)",
    label: "Research"
  },
  neutral: {
    fg: "var(--text-secondary)",
    bg: "var(--surface-raised)",
    label: ""
  }
};
function Badge({
  tone = "neutral",
  children,
  style
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 22,
      padding: "0 10px",
      borderRadius: "var(--radius-sm)",
      background: t.bg,
      color: t.fg,
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-caps)",
      whiteSpace: "nowrap",
      ...style
    }
  }, children !== undefined && children !== null ? children : t.label);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/CacheDot.jsx
try { (() => {
function CacheDot({
  hit = false,
  showLabel = false
}) {
  return /*#__PURE__*/React.createElement("span", {
    title: hit ? "Served from cache" : "Fetched live",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: hit ? "var(--cache-hit)" : "var(--cache-miss)",
      boxShadow: hit ? "0 0 6px rgba(61,189,138,0.6)" : "none",
      flexShrink: 0
    }
  }), showLabel && (hit ? "cache hit" : "live fetch"));
}
Object.assign(__ds_scope, { CacheDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/CacheDot.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function Card({
  children,
  title,
  accent,
  padding = "var(--space-5)",
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-card)",
      border: `1px solid ${accent ? accent : "var(--border-default)"}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-card)",
      padding,
      fontFamily: "var(--font-body)",
      color: "var(--text-body)",
      ...style
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-md)",
      fontWeight: 600,
      margin: "0 0 var(--space-4) 0",
      color: "var(--text-body)"
    }
  }, title), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Chip.jsx
try { (() => {
function Chip({
  children,
  onClick,
  onRemove,
  selected = false,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!onClick;
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      height: "var(--height-chip)",
      padding: onRemove ? "0 8px 0 14px" : "0 14px",
      background: selected ? "var(--tint-blue)" : "var(--surface-card)",
      color: selected ? "var(--accent)" : "var(--text-body)",
      border: `1px solid ${selected ? "rgba(79,142,247,0.4)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      cursor: interactive ? "pointer" : "default",
      boxShadow: interactive && hover ? "var(--shadow-lift)" : "none",
      transform: interactive && hover ? "translateY(-1px)" : "none",
      transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), background var(--dur-fast) var(--ease-out)",
      whiteSpace: "nowrap",
      ...style
    }
  }, children, onRemove && /*#__PURE__*/React.createElement("span", {
    role: "button",
    "aria-label": "Dismiss",
    onClick: e => {
      e.stopPropagation();
      onRemove();
    },
    style: {
      width: 16,
      height: 16,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      fontSize: 12,
      color: "var(--text-muted)",
      cursor: "pointer"
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Chip.jsx", error: String((e && e.message) || e) }); }

// components/display/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  active,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: "flex",
      gap: 4,
      borderBottom: "1px solid var(--border-default)",
      fontFamily: "var(--font-body)",
      ...style
    }
  }, tabs.map(tab => {
    const t = typeof tab === "string" ? {
      id: tab,
      label: tab
    } : tab;
    const isActive = t.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": isActive,
      type: "button",
      onClick: () => onChange && onChange(t.id),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "10px 14px",
        marginBottom: -1,
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
        borderBottom: `2px solid ${isActive ? "var(--nav-active)" : "transparent"}`,
        transition: "color var(--dur-fast) var(--ease-out)",
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }
    }, t.label, t.count !== undefined && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        background: isActive ? "var(--tint-blue)" : "var(--surface-raised)",
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        borderRadius: "var(--radius-sm)",
        padding: "1px 6px"
      }
    }, t.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Disclaimer.jsx
try { (() => {
function Disclaimer({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("aside", {
    role: "note",
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "var(--space-4) var(--space-5)",
      background: "var(--tint-amber)",
      border: "1px solid rgba(224, 154, 58, 0.45)",
      borderRadius: "var(--radius-lg)",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)",
      lineHeight: "var(--leading-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--severity-moderate)",
      flexShrink: 0,
      display: "flex",
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 17h.01"
  }))), /*#__PURE__*/React.createElement("span", null, children || /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--severity-moderate)",
      fontWeight: 600
    }
  }, "Not medical advice."), " ", "DosePair is an informational tool. Interaction analyses are generated from public drug databases and AI reasoning, and may be incomplete or incorrect. Always confirm medication changes with your doctor or pharmacist.")));
}
Object.assign(__ds_scope, { Disclaimer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Disclaimer.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  mono = false,
  style,
  inputStyle,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontFamily: "var(--font-body)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontFamily: "var(--font-mono)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-caps)",
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      height: "var(--height-input)",
      padding: "0 12px",
      background: "var(--surface-page)",
      border: `1px solid ${focus ? "var(--border-focus)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-md)",
      color: "var(--text-body)",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
      fontSize: "var(--text-base)",
      outline: "none",
      boxShadow: focus ? "var(--glow-focus)" : "none",
      transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
      ...inputStyle
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  options = [],
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontFamily: "var(--font-body)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontFamily: "var(--font-mono)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-caps)",
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      height: "var(--height-input)",
      padding: "0 32px 0 12px",
      width: "100%",
      background: "var(--surface-page)",
      border: `1px solid ${focus ? "var(--border-focus)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-md)",
      color: "var(--text-body)",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      outline: "none",
      boxShadow: focus ? "var(--glow-focus)" : "none",
      appearance: "none",
      WebkitAppearance: "none",
      cursor: "pointer",
      transition: "border-color var(--dur-fast) var(--ease-out)"
    }
  }, rest), options.map(o => {
    const opt = typeof o === "string" ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "var(--text-secondary)",
      fontSize: 10
    }
  }, "\u25BE")));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "switch",
    "aria-checked": checked,
    tabIndex: disabled ? -1 : 0,
    onClick: () => !disabled && onChange && onChange(!checked),
    onKeyDown: e => {
      if (!disabled && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        onChange && onChange(!checked);
      }
    },
    style: {
      width: 40,
      height: 22,
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--accent)" : "var(--surface-raised)",
      border: `1px solid ${checked ? "var(--accent)" : "var(--border-default)"}`,
      position: "relative",
      flexShrink: 0,
      transition: "background var(--dur-base) var(--ease-out)",
      outline: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: checked ? 19 : 2,
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: checked ? "#FFFFFF" : "var(--text-secondary)",
      transition: "left var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)"
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/TagInput.jsx
try { (() => {
/**
 * Homepage search: pill-shaped tag-input. Confirmed drugs become removable
 * chips inside the field; typing `+` or `,` or Enter confirms the current text.
 */
function TagInput({
  tags = [],
  onChange,
  placeholder = 'Search drug combinations... e.g. "Warfarin + Aspirin"',
  maxTags = 15,
  suggestions = [],
  onSubmit,
  autoFocus = false
}) {
  const [text, setText] = React.useState("");
  const [focus, setFocus] = React.useState(false);
  const inputRef = React.useRef(null);
  const confirm = raw => {
    const name = raw.trim();
    if (!name || tags.length >= maxTags) return;
    if (tags.some(t => t.toLowerCase() === name.toLowerCase())) {
      setText("");
      return;
    }
    onChange && onChange([...tags, name]);
    setText("");
  };
  const handleKey = e => {
    if (e.key === "+" || e.key === ",") {
      e.preventDefault();
      confirm(text);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (text.trim()) confirm(text);else if (tags.length > 0 && onSubmit) onSubmit(tags);
    } else if (e.key === "Backspace" && !text && tags.length) {
      onChange && onChange(tags.slice(0, -1));
    }
  };
  const matched = text.trim() ? suggestions.filter(s => s.toLowerCase().startsWith(text.trim().toLowerCase()) && !tags.some(t => t.toLowerCase() === s.toLowerCase())).slice(0, 6) : [];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      maxWidth: "var(--width-search-max)",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => inputRef.current && inputRef.current.focus(),
    style: {
      minHeight: "var(--height-search)",
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
      padding: "8px 20px",
      background: "var(--surface-card)",
      border: `1px solid ${focus ? "var(--border-focus)" : "var(--border-default)"}`,
      borderRadius: "calc(var(--height-search) / 2)",
      boxShadow: focus ? "var(--glow-search)" : "var(--shadow-card)",
      transition: "border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
      cursor: "text"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--text-secondary)",
      display: "flex",
      marginRight: 4
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  }))), tags.map(tag => /*#__PURE__*/React.createElement("span", {
    key: tag,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 28,
      padding: "0 6px 0 12px",
      background: "var(--tint-blue)",
      color: "var(--accent)",
      border: "1px solid rgba(79,142,247,0.35)",
      borderRadius: "var(--radius-pill)",
      fontSize: "var(--text-sm)",
      fontWeight: 500
    }
  }, tag, /*#__PURE__*/React.createElement("span", {
    role: "button",
    "aria-label": `Remove ${tag}`,
    onClick: e => {
      e.stopPropagation();
      onChange && onChange(tags.filter(t => t !== tag));
    },
    style: {
      cursor: "pointer",
      width: 16,
      height: 16,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      fontSize: 12,
      color: "var(--text-secondary)"
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    value: text,
    autoFocus: autoFocus,
    onChange: e => setText(e.target.value),
    onKeyDown: handleKey,
    onFocus: () => setFocus(true),
    onBlur: () => setTimeout(() => setFocus(false), 120),
    placeholder: tags.length ? "" : placeholder,
    style: {
      flex: 1,
      minWidth: 120,
      border: "none",
      outline: "none",
      background: "transparent",
      color: "var(--text-body)",
      fontSize: "var(--text-base)",
      fontFamily: "var(--font-body)",
      height: 32
    }
  })), focus && matched.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 16,
      right: 16,
      zIndex: 20,
      background: "var(--surface-raised)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lift)",
      overflow: "hidden"
    }
  }, matched.map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    onMouseDown: e => {
      e.preventDefault();
      confirm(s);
    },
    style: {
      padding: "10px 16px",
      fontSize: "var(--text-base)",
      color: "var(--text-body)",
      cursor: "pointer"
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--tint-blue)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
    }
  }, s))));
}
Object.assign(__ds_scope, { TagInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TagInput.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopNav.jsx
try { (() => {
const DEFAULT_LINKS = [{
  id: "home",
  label: "Home"
}, {
  id: "analyze",
  label: "Analyzer"
}, {
  id: "research",
  label: "Research"
}, {
  id: "history",
  label: "History"
}, {
  id: "settings",
  label: "Settings"
}];
function TopNav({
  links = DEFAULT_LINKS,
  active = "home",
  onNavigate,
  logoSrc,
  fixed = false
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: fixed ? "fixed" : "sticky",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      height: "var(--height-nav)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-6)",
      padding: "0 var(--space-5)",
      background: "var(--nav-bg)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-default)",
      fontFamily: "var(--font-body)",
      boxSizing: "border-box"
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => onNavigate && onNavigate("home"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: onNavigate ? "pointer" : "default",
      flexShrink: 0
    }
  }, logoSrc && /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "",
    width: "24",
    height: "24",
    style: {
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "var(--text-md)",
      color: "var(--text-body)",
      letterSpacing: "-0.01em"
    }
  }, "DosePair")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginLeft: "auto"
    }
  }, links.map(link => {
    const isActive = link.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: link.id,
      type: "button",
      onClick: () => onNavigate && onNavigate(link.id),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        height: "var(--height-nav)",
        padding: "0 14px",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
        borderBottom: `2px solid ${isActive ? "var(--nav-active)" : "transparent"}`,
        marginBottom: -1,
        transition: "color var(--dur-fast) var(--ease-out)"
      },
      onMouseEnter: e => {
        if (!isActive) e.currentTarget.style.color = "var(--text-body)";
      },
      onMouseLeave: e => {
        if (!isActive) e.currentTarget.style.color = "var(--text-secondary)";
      }
    }, link.label);
  })));
}
Object.assign(__ds_scope, { TopNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopNav.jsx", error: String((e && e.message) || e) }); }

// tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dosepair_android/android-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// Android.jsx — Simplified Android (Material 3) device frame
// Status bar + top app bar + content + gesture nav + keyboard.
// Based on Figma M3 spec. No dependencies, no image assets.
// Exports (to window): AndroidDevice, AndroidStatusBar, AndroidAppBar, AndroidListItem, AndroidNavBar, AndroidKeyboard
//
// Usage — wrap your screen content in <AndroidDevice> to get the bezel, status
// bar and gesture nav (props: title, large, keyboard, dark):
//
//   <AndroidDevice title="Inbox" large>
//     ...your screen content...
//   </AndroidDevice>
//   <AndroidDevice title="Compose" keyboard>…</AndroidDevice>
/* END USAGE */

const MD_C = {
  surface: '#f4fbf8',
  surfaceVariant: '#dae5e1',
  inverseOnSurface: '#ecf2ef',
  secondaryContainer: '#cde8e1',
  primaryFixedDim: '#83d5c6',
  onSurface: '#171d1b',
  onSurfaceVar: '#49454f',
  onPrimaryContainer: '#00201c',
  primary: '#006a60',
  frameBorder: 'rgba(116,119,117,0.5)'
};

// ─────────────────────────────────────────────────────────────
// Status bar (time left, wifi/cell/battery right)
// ─────────────────────────────────────────────────────────────
function AndroidStatusBar({
  dark = false
}) {
  const c = dark ? '#fff' : MD_C.onSurface;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'relative',
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 128,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 0.25,
      lineHeight: '20px',
      color: c
    }
  }, "9:30")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: 8,
      transform: 'translateX(-50%)',
      width: 24,
      height: 24,
      borderRadius: 100,
      background: '#2e2e2e'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      paddingRight: 2
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    style: {
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 13.3L.67 5.97a10.37 10.37 0 0114.66 0L8 13.3z",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    style: {
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14.67 14.67V1.33L1.33 14.67h13.34z",
    fill: c
  }))), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3.75",
    y: "2",
    width: "8.5",
    height: "13",
    rx: "1.5",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "0.9",
    width: "5",
    height: "2",
    rx: "0.5",
    fill: c
  }))));
}

// ─────────────────────────────────────────────────────────────
// Top app bar (Material 3 small/medium)
// ─────────────────────────────────────────────────────────────
function AndroidAppBar({
  title = 'Title',
  large = false
}) {
  const iconDot = /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: MD_C.onSurfaceVar,
      opacity: 0.3
    }
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: MD_C.surface,
      padding: '4px 4px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, iconDot, !large && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 22,
      fontWeight: 400,
      color: MD_C.onSurface,
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, title), large && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), iconDot), large && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 16px 20px',
      fontSize: 28,
      fontWeight: 400,
      color: MD_C.onSurface,
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// List item (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidListItem({
  headline,
  supporting,
  leading
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '12px 16px',
      minHeight: 56,
      boxSizing: 'border-box',
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, leading && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: MD_C.primary,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 500,
      flexShrink: 0
    }
  }, leading), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: MD_C.onSurface,
      lineHeight: '24px'
    }
  }, headline), supporting && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: MD_C.onSurfaceVar,
      lineHeight: '20px'
    }
  }, supporting)));
}

// ─────────────────────────────────────────────────────────────
// Gesture nav bar (pill)
// ─────────────────────────────────────────────────────────────
function AndroidNavBar({
  dark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 108,
      height: 4,
      borderRadius: 2,
      background: dark ? '#fff' : MD_C.onSurface,
      opacity: 0.4
    }
  }));
}

// ─────────────────────────────────────────────────────────────
// Device frame — wraps everything
// ─────────────────────────────────────────────────────────────
function AndroidDevice({
  children,
  width = 412,
  height = 892,
  dark = false,
  title,
  large = false,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 18,
      overflow: 'hidden',
      background: dark ? '#1d1b20' : MD_C.surface,
      border: `8px solid ${MD_C.frameBorder}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(AndroidStatusBar, {
    dark: dark
  }), title !== undefined && /*#__PURE__*/React.createElement(AndroidAppBar, {
    title: title,
    large: large
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(AndroidKeyboard, null), /*#__PURE__*/React.createElement(AndroidNavBar, {
    dark: dark
  }));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — Gboard (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidKeyboard() {
  let _k = 0;
  const key = (l, {
    flex = 1,
    bg = MD_C.surface,
    r = 6,
    minW,
    fs = 21
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: _k++,
    style: {
      height: 46,
      borderRadius: r,
      flex,
      minWidth: minW,
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Roboto, system-ui',
      fontSize: fs,
      color: MD_C.onPrimaryContainer
    }
  }, l);
  const row = (keys, style = {}) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      justifyContent: 'center',
      ...style
    }
  }, keys.map(l => key(l)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: MD_C.inverseOnSurface,
      padding: '0 8px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], {
    padding: '0 20px'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, key('', {
    bg: MD_C.surfaceVariant
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flex: 7,
      minWidth: 274
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l))), key('', {
    bg: MD_C.surfaceVariant
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, key('?123', {
    bg: MD_C.secondaryContainer,
    r: 100,
    minW: 58,
    fs: 14
  }), key(',', {
    bg: MD_C.surfaceVariant
  }), key('', {
    flex: 3,
    minW: 154
  }), key('.', {
    bg: MD_C.surfaceVariant
  }), key('', {
    bg: MD_C.primaryFixedDim,
    r: 100,
    minW: 58
  }))));
}
Object.assign(window, {
  AndroidDevice,
  AndroidStatusBar,
  AndroidAppBar,
  AndroidListItem,
  AndroidNavBar,
  AndroidKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dosepair_android/android-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dosepair_ios/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dosepair_ios/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dosepair_web/AnalyzerScreen.jsx
try { (() => {
/* DosePair web — Analyzer (route "/analyze"): structured medication rows +
   disease field, inline results below. Mock pipeline, no network. */

const PK_DB = {
  Warfarin: {
    rxcui: "11289",
    halfLife: 40,
    peakOffset: 4,
    metabolism: "CYP2C9",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Aspirin: {
    rxcui: "1191",
    halfLife: 6,
    peakOffset: 1,
    metabolism: "Hepatic esterases",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Dovato: {
    rxcui: "2375961",
    halfLife: 14,
    peakOffset: 1.5,
    metabolism: "UGT1A1 85%, CYP3A4 12%",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Tadalafil: {
    rxcui: "358263",
    halfLife: 17.5,
    peakOffset: 2,
    metabolism: "CYP3A4 primary",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Luteolin: {
    rxcui: "—",
    halfLife: 5,
    peakOffset: 1,
    metabolism: "CYP3A4 inhibitor",
    route: "oral",
    cache_hit: false,
    pk_source: "llm"
  },
  Metformin: {
    rxcui: "6809",
    halfLife: 6.2,
    peakOffset: 2.5,
    metabolism: "Renal, unchanged",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Lisinopril: {
    rxcui: "29046",
    halfLife: 12,
    peakOffset: 6,
    metabolism: "Renal, unchanged",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Atorvastatin: {
    rxcui: "83367",
    halfLife: 14,
    peakOffset: 1.5,
    metabolism: "CYP3A4",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Amlodipine: {
    rxcui: "17767",
    halfLife: 40,
    peakOffset: 7,
    metabolism: "CYP3A4",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Sertraline: {
    rxcui: "36437",
    halfLife: 26,
    peakOffset: 5,
    metabolism: "CYP2D6, CYP2C19",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Tramadol: {
    rxcui: "10689",
    halfLife: 6.3,
    peakOffset: 2,
    metabolism: "CYP2D6, CYP3A4",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Omeprazole: {
    rxcui: "7646",
    halfLife: 1,
    peakOffset: 1,
    metabolism: "CYP2C19",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Clopidogrel: {
    rxcui: "32968",
    halfLife: 6,
    peakOffset: 1,
    metabolism: "CYP2C19 (prodrug)",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Levothyroxine: {
    rxcui: "10582",
    halfLife: 168,
    peakOffset: 2,
    metabolism: "Deiodination",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  },
  Calcium: {
    rxcui: "1897",
    halfLife: 4,
    peakOffset: 2,
    metabolism: "None (mineral)",
    route: "oral",
    cache_hit: true,
    pk_source: "openfda"
  },
  Ibuprofen: {
    rxcui: "5640",
    halfLife: 2,
    peakOffset: 1.5,
    metabolism: "CYP2C9",
    route: "oral",
    cache_hit: true,
    pk_source: "dailymed"
  }
};
const IX_DB = [{
  pair: ["Warfarin", "Aspirin"],
  severity: "high",
  cache_hit: true,
  source: "rxnav",
  effect: "Significantly increased bleeding risk — additive anticoagulant and antiplatelet effects.",
  mechanism: "Aspirin inhibits platelet aggregation while warfarin blocks vitamin-K-dependent clotting factors; aspirin also displaces warfarin from plasma proteins."
}, {
  pair: ["Warfarin", "Ibuprofen"],
  severity: "high",
  cache_hit: true,
  source: "rxnav",
  effect: "NSAIDs with warfarin sharply raise GI bleeding risk.",
  mechanism: "COX inhibition impairs platelet function and gastric protection on top of anticoagulation."
}, {
  pair: ["Sertraline", "Tramadol"],
  severity: "high",
  cache_hit: true,
  source: "rxnav",
  effect: "Risk of serotonin syndrome and lowered seizure threshold.",
  mechanism: "Both agents increase synaptic serotonin; tramadol's metabolite adds μ-opioid and SNRI activity via CYP2D6 competition."
}, {
  pair: ["Omeprazole", "Clopidogrel"],
  severity: "moderate",
  cache_hit: true,
  source: "rxnav",
  effect: "Reduced antiplatelet effect of clopidogrel.",
  mechanism: "Omeprazole inhibits CYP2C19, which activates the clopidogrel prodrug."
}, {
  pair: ["Levothyroxine", "Calcium"],
  severity: "moderate",
  cache_hit: true,
  source: "rxnav",
  effect: "Reduced levothyroxine absorption when taken together.",
  mechanism: "Calcium binds levothyroxine in the gut; separate doses by at least 4 hours."
}, {
  pair: ["Tadalafil", "Luteolin"],
  severity: "moderate",
  cache_hit: false,
  source: "llm",
  effect: "Possible increased tadalafil exposure and prolonged effect.",
  mechanism: "Luteolin moderately inhibits CYP3A4, the primary clearance pathway for tadalafil."
}, {
  pair: ["Atorvastatin", "Amlodipine"],
  severity: "moderate",
  cache_hit: true,
  source: "rxnav",
  effect: "Modestly increased statin exposure; monitor for myopathy.",
  mechanism: "Amlodipine weakly inhibits CYP3A4-mediated atorvastatin clearance."
}, {
  pair: ["Metformin", "Lisinopril"],
  severity: "low",
  cache_hit: true,
  source: "rxnav",
  effect: "Generally safe; small additive effect on blood glucose.",
  mechanism: "ACE inhibitors can mildly enhance insulin sensitivity."
}];
const DEFAULT_HOURS = [8, 10, 13, 18, 21];
function buildResult(meds, disease) {
  const drugs = meds.map((m, i) => {
    const pk = PK_DB[m.name] || {
      rxcui: "—",
      halfLife: 8,
      peakOffset: 2,
      metabolism: "Unknown — LLM estimated",
      route: m.route || "oral",
      cache_hit: false,
      pk_source: "llm"
    };
    const doseHour = m.hour !== undefined ? m.hour : DEFAULT_HOURS[i % DEFAULT_HOURS.length];
    return {
      name: m.name,
      time: m.time || (doseHour <= 12 ? doseHour + "am" : doseHour - 12 + "pm"),
      doseHour,
      dose: m.dose,
      route: m.route || pk.route,
      ...pk
    };
  });
  const names = drugs.map(d => d.name);
  const interactions = IX_DB.filter(ix => ix.pair.every(p => names.includes(p)));
  const order = {
    high: 0,
    moderate: 1,
    low: 2
  };
  interactions.sort((a, b) => order[a.severity] - order[b.severity]);
  const insights = [];
  interactions.forEach(ix => {
    if (ix.severity === "high") insights.push({
      type: "warning",
      text: `Avoid combining ${ix.pair[0]} and ${ix.pair[1]} without clinical supervision.`,
      why: ix.mechanism,
      related_drugs: ix.pair,
      actionable: false
    });else if (ix.severity === "moderate") insights.push({
      type: "tip",
      text: `Separate ${ix.pair[0]} and ${ix.pair[1]} doses to reduce peak overlap.`,
      why: ix.mechanism,
      related_drugs: ix.pair,
      actionable: true
    });
  });
  insights.push({
    type: "info",
    text: `${drugs.filter(d => d.cache_hit).length} of ${drugs.length} drugs served from cache.`,
    why: "Cached pharmacokinetic data skips live DailyMed fetches, making analysis faster and cheaper.",
    related_drugs: [],
    actionable: false
  });
  const schedule = drugs.map((d, i) => {
    const hour = Math.max(6, Math.min(22, 7 + i * Math.max(2, Math.round(12 / drugs.length))));
    return {
      drug: d.name,
      hour,
      time: hour <= 12 ? hour + "am" : hour - 12 + "pm",
      recommended: true
    };
  });
  const windows = interactions.slice(0, 2).map(ix => {
    const a = drugs.find(d => d.name === ix.pair[0]);
    const b = drugs.find(d => d.name === ix.pair[1]);
    const start = Math.min(a.doseHour, b.doseHour);
    return {
      start,
      end: Math.min(24, start + 4),
      severity: ix.severity
    };
  });
  const worst = interactions[0] ? interactions[0].severity : null;
  const summary = interactions.length ? `Found ${interactions.length} interaction${interactions.length > 1 ? "s" : ""} across ${drugs.length} medications — worst severity ${worst}. ${insights.find(i => i.actionable) ? "Timing adjustments below can reduce peak overlap." : "Review the cards below before making any changes."}` : `No known interactions found across ${drugs.length} medication${drugs.length > 1 ? "s" : ""}. Pharmacokinetic profiles and an optimized schedule are shown below.`;
  const allKnown = drugs.every(d => d.pk_source !== "llm");
  return {
    drugs,
    interactions,
    insights,
    schedule,
    windows,
    summary,
    llm_source: allKnown ? "groq" : "claude haiku",
    disease
  };
}
function AnalyzerScreen({
  initialDrugs = []
}) {
  const {
    Button,
    Input,
    Select,
    Card,
    Badge,
    Disclaimer
  } = window.DosePairDesignSystem_7db6c7;
  const {
    PlasmaChart,
    InteractionList,
    InsightsList,
    ScheduleTimeline,
    PKTable
  } = window.DosePairDesignSystem_7db6c7;
  const mkRow = (name = "", i = 0) => ({
    name,
    dose: "",
    time: "",
    route: "oral",
    key: name + "-" + i + "-" + Math.random().toString(36).slice(2, 7)
  });
  const [rows, setRows] = React.useState(() => initialDrugs.length ? initialDrugs.map(mkRow) : [mkRow("Dovato", 0), mkRow("Tadalafil", 1)]);
  const [disease, setDisease] = React.useState("");
  const [result, setResult] = React.useState(() => initialDrugs.length ? buildResult(initialDrugs.map(n => ({
    name: n
  })), "") : null);
  const [loading, setLoading] = React.useState(false);
  const setRow = (i, patch) => setRows(rows.map((r, j) => j === i ? {
    ...r,
    ...patch
  } : r));
  const analyze = () => {
    const meds = rows.filter(r => r.name.trim());
    if (!meds.length) return;
    setLoading(true);
    setTimeout(() => {
      setResult(buildResult(meds, disease.trim()));
      setLoading(false);
    }, 600);
  };
  const label = {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-xs)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-caps)",
    color: "var(--text-muted)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 880,
      margin: "0 auto",
      padding: "40px 24px 80px",
      fontFamily: "var(--font-body)",
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-lg)",
      margin: 0
    }
  }, "Analyzer"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--text-secondary)",
      fontSize: "var(--text-sm)"
    }
  }, "Enter each medication with dose, time and route. Add a condition to include disease research.")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, rows.map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: row.key,
    style: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
      gap: 12,
      alignItems: "end"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: i === 0 ? "Medication" : undefined,
    placeholder: "e.g. Tadalafil",
    value: row.name,
    onChange: e => setRow(i, {
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement(Input, {
    label: i === 0 ? "Dose" : undefined,
    placeholder: "5mg",
    mono: true,
    value: row.dose,
    onChange: e => setRow(i, {
      dose: e.target.value
    })
  }), /*#__PURE__*/React.createElement(Input, {
    label: i === 0 ? "Time" : undefined,
    placeholder: "8am",
    mono: true,
    value: row.time,
    onChange: e => setRow(i, {
      time: e.target.value
    })
  }), /*#__PURE__*/React.createElement(Select, {
    label: i === 0 ? "Route" : undefined,
    options: ["oral", "topical", "injection", "inhaled"],
    value: row.route,
    onChange: e => setRow(i, {
      route: e.target.value
    })
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => setRows(rows.filter((_, j) => j !== i)),
    "aria-label": "Remove row",
    style: {
      marginBottom: 4
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 12,
      alignItems: "end"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Disease / condition (optional)",
    placeholder: "e.g. HIV",
    value: disease,
    onChange: e => setDisease(e.target.value),
    hint: "Unlocks the clinical research panel"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    disabled: rows.length >= 15,
    onClick: () => setRows([...rows, mkRow("", rows.length)])
  }, "+ Add medication"), /*#__PURE__*/React.createElement(Button, {
    onClick: analyze,
    disabled: loading
  }, loading ? "Analyzing…" : "Analyze Interactions"))))), result && !loading && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, {
    title: "Summary"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, result.llm_source), /*#__PURE__*/React.createElement(Badge, null, result.drugs.filter(d => d.cache_hit).length, "/", result.drugs.length, " cache hits")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-base)",
      color: "var(--text-body)"
    }
  }, result.summary)), /*#__PURE__*/React.createElement(Card, {
    title: "24-hour plasma levels"
  }, /*#__PURE__*/React.createElement(PlasmaChart, {
    drugs: result.drugs,
    windows: result.windows,
    schedule: result.schedule
  })), result.interactions.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: label
  }, "Interactions \xB7 ", result.interactions.length), /*#__PURE__*/React.createElement(InteractionList, {
    interactions: result.interactions
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: label
  }, "Insights"), /*#__PURE__*/React.createElement(InsightsList, {
    insights: result.insights
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Recommended schedule",
    id: "schedule"
  }, /*#__PURE__*/React.createElement(ScheduleTimeline, {
    schedule: result.schedule
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Pharmacokinetics"
  }, /*#__PURE__*/React.createElement(PKTable, {
    drugs: result.drugs
  })), /*#__PURE__*/React.createElement(Disclaimer, null)), loading && /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--text-secondary)",
      fontSize: "var(--text-sm)",
      fontFamily: "var(--font-mono)"
    }
  }, "Checking drug_cache \u2192 fetching PK data \u2192 routing to LLM\u2026")));
}
Object.assign(__ds_scope, { AnalyzerScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dosepair_web/AnalyzerScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dosepair_web/HistoryScreen.jsx
try { (() => {
/* DosePair web — History (route "/history"): session-scoped past analyses. */

const MOCK_HISTORY = [{
  ts: "Today, 9:42am",
  drugs: ["Dovato", "Tadalafil", "Luteolin"],
  worst: "moderate",
  llm: "claude haiku"
}, {
  ts: "Today, 8:15am",
  drugs: ["Warfarin", "Aspirin"],
  worst: "high",
  llm: "groq"
}, {
  ts: "Yesterday, 10:03pm",
  drugs: ["Sertraline", "Tramadol"],
  worst: "high",
  llm: "groq"
}, {
  ts: "Yesterday, 2:31pm",
  drugs: ["Metformin", "Lisinopril"],
  worst: "low",
  llm: "groq"
}, {
  ts: "Jun 7, 11:20am",
  drugs: ["Levothyroxine", "Calcium"],
  worst: "moderate",
  llm: "groq"
}];
function HistoryScreen({
  onReanalyze
}) {
  const {
    Card,
    Badge,
    Chip,
    Button
  } = window.DosePairDesignSystem_7db6c7;
  const [items, setItems] = React.useState(MOCK_HISTORY);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 880,
      margin: "0 auto",
      padding: "40px 24px 80px",
      fontFamily: "var(--font-body)",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "end",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-lg)",
      margin: 0
    }
  }, "History"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--text-secondary)",
      fontSize: "var(--text-sm)"
    }
  }, "Analyses from this session, stored locally. ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, "session b4f2\u202691ce"))), items.length > 0 && /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm",
    onClick: () => setItems([])
  }, "Clear history")), items.length === 0 ? /*#__PURE__*/React.createElement(Card, {
    style: {
      textAlign: "center",
      padding: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 4px",
      fontWeight: 500
    }
  }, "No analyses yet"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--text-secondary)",
      fontSize: "var(--text-sm)"
    }
  }, "Run a search from the home page and it will appear here.")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, items.map((h, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    padding: "var(--space-3) var(--space-4)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-muted)",
      width: 140,
      flexShrink: 0
    }
  }, h.ts), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      flex: 1
    }
  }, h.drugs.map(d => /*#__PURE__*/React.createElement(Chip, {
    key: d,
    style: {
      height: 24,
      fontSize: 12
    }
  }, d))), /*#__PURE__*/React.createElement(Badge, {
    tone: h.worst
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, h.llm), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    onClick: () => onReanalyze && onReanalyze(h.drugs)
  }, "Re-analyze"))))));
}
Object.assign(__ds_scope, { HistoryScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dosepair_web/HistoryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dosepair_web/HomeScreen.jsx
try { (() => {
/* DosePair web — Home / Search (route "/"). Google-style: centered lockup,
   pill tag-input, quick combos, recent searches, hero stats. */

const QUICK_COMBOS = [["Warfarin", "Aspirin"], ["Metformin", "Lisinopril"], ["Atorvastatin", "Amlodipine"], ["Sertraline", "Tramadol"], ["Omeprazole", "Clopidogrel"], ["Levothyroxine", "Calcium"]];
const SUGGESTIONS = ["Aspirin", "Atorvastatin", "Amlodipine", "Amoxicillin", "Calcium", "Clopidogrel", "Dovato", "Gabapentin", "Levothyroxine", "Lisinopril", "Luteolin", "Metformin", "Omeprazole", "Pregabalin", "Sertraline", "Sildenafil", "Tadalafil", "Tramadol", "Warfarin"];
function HomeScreen({
  onAnalyze,
  logoSrc
}) {
  const {
    TagInput,
    Button,
    Chip
  } = window.DosePairDesignSystem_7db6c7;
  const [drugs, setDrugs] = React.useState([]);
  const [recent, setRecent] = React.useState([["Dovato", "Tadalafil", "Luteolin"], ["Warfarin", "Ibuprofen"]]);
  const run = names => {
    if (names.length) onAnalyze(names);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      minHeight: "calc(100vh - 56px)",
      overflow: "hidden",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "radial-gradient(rgba(154,160,173,0.14) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
      WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 38%, black 20%, transparent 75%)",
      maskImage: "radial-gradient(ellipse 60% 55% at 50% 38%, black 20%, transparent 75%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "13vh"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, logoSrc && /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "",
    width: "44",
    height: "44"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "var(--text-2xl)",
      letterSpacing: "-0.02em",
      color: "var(--text-body)"
    }
  }, "DosePair")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 36px",
      color: "var(--text-secondary)",
      fontSize: "var(--text-base)"
    }
  }, "See how your medications interact \u2014 before they do."), /*#__PURE__*/React.createElement(TagInput, {
    tags: drugs,
    onChange: setDrugs,
    suggestions: SUGGESTIONS,
    onSubmit: run,
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    disabled: drugs.length === 0,
    onClick: () => run(drugs)
  }, "Analyze Interactions")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 48,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      alignItems: "center",
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-caps)",
      color: "var(--text-muted)"
    }
  }, "Quick combos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "center"
    }
  }, QUICK_COMBOS.map(combo => /*#__PURE__*/React.createElement(Chip, {
    key: combo.join("+"),
    onClick: () => run(combo)
  }, combo.join(" + ")))), recent.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-caps)",
      color: "var(--text-muted)",
      marginTop: 8
    }
  }, "Recent searches"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "center"
    }
  }, recent.map((combo, i) => /*#__PURE__*/React.createElement(Chip, {
    key: combo.join("+"),
    onClick: () => run(combo),
    onRemove: () => setRecent(recent.filter((_, j) => j !== i))
  }, combo.join(" + ")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 64,
      display: "flex",
      gap: 40,
      color: "var(--text-muted)",
      fontSize: "var(--text-sm)",
      fontFamily: "var(--font-mono)"
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-secondary)",
      fontWeight: 500
    }
  }, "12,400+"), " drugs indexed"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-secondary)",
      fontWeight: 500
    }
  }, "850K+"), " interactions cached"), /*#__PURE__*/React.createElement("span", null, "Powered by DailyMed + OpenFDA"))));
}
Object.assign(__ds_scope, { HomeScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dosepair_web/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dosepair_web/ResearchScreen.jsx
try { (() => {
/* DosePair web — Research (route "/research"): disease search +
   trials / PubMed / FDA tabs. Mock data, 7-day cache indicator. */

const MOCK = {
  trials: [{
    id: "NCT05451234",
    title: "Long-acting injectable dolutegravir combinations in virally suppressed adults",
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "ViiV Healthcare"
  }, {
    id: "NCT05512879",
    title: "Doravirine/islatravir switch study versus continued ART",
    phase: "Phase 3",
    status: "Active, not recruiting",
    sponsor: "Merck Sharp & Dohme"
  }, {
    id: "NCT05634321",
    title: "Broadly neutralizing antibody maintenance after ART interruption",
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "NIAID"
  }, {
    id: "NCT05729984",
    title: "Weekly oral lenacapavir plus islatravir in treatment-experienced adults",
    phase: "Phase 2",
    status: "Enrolling by invitation",
    sponsor: "Gilead Sciences"
  }],
  pubmed: [{
    pmid: "38412309",
    title: "Drug–drug interactions between antiretrovirals and PDE5 inhibitors: a systematic review",
    journal: "Clin Pharmacokinet",
    year: 2025
  }, {
    pmid: "38217745",
    title: "UGT1A1 polymorphisms and dolutegravir exposure in diverse populations",
    journal: "Br J Clin Pharmacol",
    year: 2024
  }, {
    pmid: "38095512",
    title: "Flavonoid-mediated CYP3A4 inhibition: clinical relevance of dietary supplements",
    journal: "Drug Metab Dispos",
    year: 2024
  }, {
    pmid: "37956120",
    title: "Two-drug regimens for HIV-1: durability of dolutegravir/lamivudine at 5 years",
    journal: "Lancet HIV",
    year: 2024
  }],
  fda: [{
    name: "Lenacapavir (Sunlenca)",
    date: "2022-12-22",
    note: "First capsid inhibitor — heavily treatment-experienced adults"
  }, {
    name: "Cabotegravir + rilpivirine LA (Cabenuva)",
    date: "2021-01-21",
    note: "First complete long-acting injectable regimen"
  }, {
    name: "Dolutegravir/lamivudine (Dovato)",
    date: "2019-04-08",
    note: "First 2-drug complete regimen for treatment-naïve adults"
  }]
};
function ResearchScreen({
  initialDisease = "HIV"
}) {
  const {
    Input,
    Button,
    Tabs,
    Card,
    Badge,
    CacheDot
  } = window.DosePairDesignSystem_7db6c7;
  const [query, setQuery] = React.useState(initialDisease);
  const [searched, setSearched] = React.useState(initialDisease);
  const [tab, setTab] = React.useState("trials");
  const cardMeta = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--text-muted)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 880,
      margin: "0 auto",
      padding: "40px 24px 80px",
      fontFamily: "var(--font-body)",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-lg)",
      margin: 0
    }
  }, "Research"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--text-secondary)",
      fontSize: "var(--text-sm)"
    }
  }, "Browse clinical trials, papers and FDA approvals for any condition \u2014 no medications required.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 12,
      alignItems: "end"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Condition / disease",
    placeholder: "e.g. HIV, hypertension, type 2 diabetes",
    value: query,
    onChange: e => setQuery(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") setSearched(query);
    }
  }), /*#__PURE__*/React.createElement(Button, {
    onClick: () => setSearched(query),
    style: {
      marginBottom: 1
    }
  }, "Search")), searched && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "research"
  }, searched), /*#__PURE__*/React.createElement(CacheDot, {
    hit: true,
    showLabel: true
  }), /*#__PURE__*/React.createElement("span", {
    style: cardMeta
  }, "cached 2 days ago \xB7 TTL 7 days"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    style: {
      marginLeft: "auto"
    }
  }, "Refresh")), /*#__PURE__*/React.createElement(Tabs, {
    tabs: [{
      id: "trials",
      label: "Clinical Trials",
      count: MOCK.trials.length
    }, {
      id: "pubmed",
      label: "PubMed Papers",
      count: MOCK.pubmed.length
    }, {
      id: "fda",
      label: "FDA Approvals",
      count: MOCK.fda.length
    }],
    active: tab,
    onChange: setTab
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, tab === "trials" && MOCK.trials.map(t => /*#__PURE__*/React.createElement(Card, {
    key: t.id,
    padding: "var(--space-4)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "research"
  }, t.phase), /*#__PURE__*/React.createElement(Badge, null, t.status)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 8px",
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      color: "var(--text-body)"
    }
  }, t.title), /*#__PURE__*/React.createElement("span", {
    style: cardMeta
  }, t.id, " \xB7 ", t.sponsor))), tab === "pubmed" && MOCK.pubmed.map(p => /*#__PURE__*/React.createElement(Card, {
    key: p.pmid,
    padding: "var(--space-4)"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 8px",
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      color: "var(--text-body)"
    }
  }, p.title), /*#__PURE__*/React.createElement("span", {
    style: cardMeta
  }, p.journal, " \xB7 ", p.year, " \xB7 PMID ", p.pmid))), tab === "fda" && MOCK.fda.map(f => /*#__PURE__*/React.createElement(Card, {
    key: f.name,
    padding: "var(--space-4)"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 6px",
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      color: "var(--text-body)"
    }
  }, f.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 8px",
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)"
    }
  }, f.note), /*#__PURE__*/React.createElement("span", {
    style: cardMeta
  }, "Approved ", f.date))))));
}
Object.assign(__ds_scope, { ResearchScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dosepair_web/ResearchScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dosepair_web/ResultsPanels.jsx
try { (() => {
/* DosePair web — results panels: 24h canvas chart, schedule timeline,
   interaction cards, insights, PK table. Mock visual recreations. */

const PLOTS = ["#4F8EF7", "#C084FC", "#2DD4BF", "#F472B6", "#E09A3A", "#3DBD8A"];
const SEV_COLOR = {
  high: "rgba(224,92,75,0.12)",
  moderate: "rgba(224,154,58,0.12)",
  low: "rgba(61,189,138,0.10)"
};
function conc(t, doseHour, halfLife, peakOffset) {
  let dt = t - doseHour;
  if (dt < 0) dt += 24;
  const k = Math.log(2) / halfLife;
  if (dt <= peakOffset) return dt / peakOffset * 100;
  return 100 * Math.exp(-k * (dt - peakOffset));
}
function PlasmaChart({
  drugs,
  windows = [],
  schedule = []
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth,
      H = 280;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const padL = 36,
      padR = 12,
      padT = 20,
      padB = 28;
    const plotW = W - padL - padR,
      plotH = H - padT - padB;
    const x = h => padL + h / 24 * plotW;
    const y = v => padT + (1 - v / 110) * plotH;
    ctx.clearRect(0, 0, W, H);

    // Layer 1 — interaction windows
    windows.forEach(w => {
      ctx.fillStyle = SEV_COLOR[w.severity] || SEV_COLOR.moderate;
      ctx.fillRect(x(w.start), padT, x(w.end) - x(w.start), plotH);
    });

    // grid + hour labels
    ctx.strokeStyle = "#252A3A";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#6B7280";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    for (let h = 0; h <= 24; h += 4) {
      ctx.beginPath();
      ctx.moveTo(x(h), padT);
      ctx.lineTo(x(h), padT + plotH);
      ctx.stroke();
      ctx.fillText(h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? h + "am" : h - 24 === 0 ? "12am" : h - 12 + "pm", x(h), H - 10);
    }

    // Layer 3 — schedule markers (green dashed = recommended, grey = current)
    schedule.forEach(m => {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = m.recommended ? "#3DBD8A" : "#6B7280";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x(m.hour), padT);
      ctx.lineTo(x(m.hour), padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // curves
    drugs.forEach((d, i) => {
      ctx.strokeStyle = PLOTS[i % PLOTS.length];
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let t = 0; t <= 24; t += 0.1) {
        const v = conc(t, d.doseHour, d.halfLife, d.peakOffset);
        if (t === 0) ctx.moveTo(x(t), y(v));else ctx.lineTo(x(t), y(v));
      }
      ctx.stroke();

      // Layer 2 — peak annotation
      const peakT = (d.doseHour + d.peakOffset) % 24;
      ctx.fillStyle = PLOTS[i % PLOTS.length];
      ctx.beginPath();
      ctx.arc(x(peakT), y(100), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(d.name + " peak", x(peakT) + 6, y(100) - 4);
    });
  }, [drugs, windows, schedule]);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("canvas", {
    ref: ref,
    style: {
      width: "100%",
      height: 280,
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      flexWrap: "wrap",
      marginTop: 8,
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, drugs.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: d.name,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 3,
      borderRadius: 2,
      background: PLOTS[i % PLOTS.length],
      display: "inline-block"
    }
  }), d.name)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, "bands = interaction windows \xB7 dashed = schedule")));
}
function InteractionList({
  interactions
}) {
  const {
    Card,
    Badge,
    CacheDot
  } = window.DosePairDesignSystem_7db6c7;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, interactions.map(ix => /*#__PURE__*/React.createElement(Card, {
    key: ix.pair.join("-"),
    padding: "var(--space-4) var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 6,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-base)",
      fontWeight: 600
    }
  }, ix.pair[0], " \xD7 ", ix.pair[1]), /*#__PURE__*/React.createElement(Badge, {
    tone: ix.severity
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(CacheDot, {
    hit: ix.cache_hit,
    showLabel: true
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 4px",
      fontSize: "var(--text-sm)",
      color: "var(--text-body)"
    }
  }, ix.effect), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)"
    }
  }, ix.mechanism))));
}
function InsightsList({
  insights
}) {
  const {
    Card,
    Badge,
    Chip
  } = window.DosePairDesignSystem_7db6c7;
  const toneOf = {
    warning: "moderate",
    tip: "info",
    info: "neutral"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, insights.map((ins, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    padding: "var(--space-4) var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: toneOf[ins.type] || "neutral"
  }, ins.type), ins.related_drugs.map(d => /*#__PURE__*/React.createElement(Chip, {
    key: d,
    style: {
      height: 24,
      fontSize: 12
    }
  }, d))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 4px",
      fontSize: "var(--text-base)",
      color: "var(--text-body)",
      fontWeight: 500
    }
  }, ins.text), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)"
    }
  }, "Why: ", ins.why), ins.actionable && /*#__PURE__*/React.createElement("a", {
    href: "#schedule",
    style: {
      display: "inline-block",
      marginTop: 8,
      fontSize: "var(--text-sm)",
      color: "var(--accent)",
      textDecoration: "none",
      fontWeight: 500
    }
  }, "Take action \u2192"))));
}
function ScheduleTimeline({
  schedule
}) {
  const {
    Button
  } = window.DosePairDesignSystem_7db6c7;
  const W = 760,
    H = 86,
    padL = 16,
    padR = 16;
  const x = h => padL + h / 24 * (W - padL - padR);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    style: {
      width: "100%",
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: padL,
    y1: 46,
    x2: W - padR,
    y2: 46,
    stroke: "#252A3A",
    strokeWidth: "2"
  }), [0, 6, 12, 18, 24].map(h => /*#__PURE__*/React.createElement("g", {
    key: h
  }, /*#__PURE__*/React.createElement("line", {
    x1: x(h),
    y1: 42,
    x2: x(h),
    y2: 50,
    stroke: "#6B7280",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    x: x(h),
    y: 66,
    fill: "#6B7280",
    fontSize: "9",
    fontFamily: "IBM Plex Mono, monospace",
    textAnchor: "middle"
  }, h === 0 || h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? h + "am" : h - 12 + "pm"))), schedule.map((s, i) => /*#__PURE__*/React.createElement("g", {
    key: s.drug
  }, /*#__PURE__*/React.createElement("circle", {
    cx: x(s.hour),
    cy: 46,
    r: "5",
    fill: "#3DBD8A"
  }), /*#__PURE__*/React.createElement("text", {
    x: x(s.hour),
    y: i % 2 === 0 ? 24 : 36,
    fill: "#E8EAF0",
    fontSize: "10",
    fontFamily: "IBM Plex Sans, sans-serif",
    textAnchor: "middle"
  }, s.drug, " \xB7 ", s.time)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Export .ics"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Export PDF"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost"
  }, "Copy schedule")));
}
function PKTable({
  drugs
}) {
  const {
    CacheDot
  } = window.DosePairDesignSystem_7db6c7;
  const th = {
    textAlign: "left",
    padding: "8px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-caps)",
    color: "var(--text-muted)",
    borderBottom: "1px solid var(--border-default)",
    fontWeight: 500
  };
  const td = {
    padding: "10px 12px",
    fontSize: "var(--text-sm)",
    color: "var(--text-body)",
    borderBottom: "1px solid var(--border-default)"
  };
  const mono = {
    ...td,
    fontFamily: "var(--font-mono)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Drug"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "RxCUI"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Dose time"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Half-life"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Peak"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Route"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Metabolism"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Source"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Cache"))), /*#__PURE__*/React.createElement("tbody", null, drugs.map(d => /*#__PURE__*/React.createElement("tr", {
    key: d.name
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontWeight: 500
    }
  }, d.name), /*#__PURE__*/React.createElement("td", {
    style: mono
  }, d.rxcui), /*#__PURE__*/React.createElement("td", {
    style: mono
  }, d.time), /*#__PURE__*/React.createElement("td", {
    style: mono
  }, d.halfLife, "h"), /*#__PURE__*/React.createElement("td", {
    style: mono
  }, "+", d.peakOffset, "h"), /*#__PURE__*/React.createElement("td", {
    style: td
  }, d.route), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      color: "var(--text-secondary)"
    }
  }, d.metabolism), /*#__PURE__*/React.createElement("td", {
    style: mono
  }, d.pk_source), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement(CacheDot, {
    hit: d.cache_hit
  })))))));
}
Object.assign(__ds_scope, { PlasmaChart, InteractionList, InsightsList, ScheduleTimeline, PKTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dosepair_web/ResultsPanels.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dosepair_web/SettingsScreen.jsx
try { (() => {
/* DosePair web — Settings (route "/settings"). */

function SettingsScreen() {
  const {
    Card,
    Input,
    Switch,
    Button,
    Disclaimer
  } = window.DosePairDesignSystem_7db6c7;
  const [dark, setDark] = React.useState(true);
  const [ownKey, setOwnKey] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640,
      margin: "0 auto",
      padding: "40px 24px 80px",
      fontFamily: "var(--font-body)",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-lg)",
      margin: 0
    }
  }, "Settings")), /*#__PURE__*/React.createElement(Card, {
    title: "Connection"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Backend URL",
    mono: true,
    defaultValue: "https://dosepair.app",
    hint: "Only change this if you self-host DosePair."
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: ownKey,
    onChange: setOwnKey,
    label: "Use my own Groq API key"
  }), ownKey && /*#__PURE__*/React.createElement(Input, {
    label: "Groq API key",
    mono: true,
    placeholder: "gsk_\u2026",
    hint: "Stored in this browser only; overrides the server key."
  }))), /*#__PURE__*/React.createElement(Card, {
    title: "Appearance"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: dark,
    onChange: setDark,
    label: "Dark theme"
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: !dark,
    onChange: v => setDark(!v),
    label: "Follow system"
  }))), /*#__PURE__*/React.createElement(Card, {
    title: "Data"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)"
    }
  }, "Removes all analyses stored under your anonymous session ID. Nothing else is kept.")), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm"
  }, "Clear history"))), /*#__PURE__*/React.createElement(Card, {
    title: "About"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 8px",
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)"
    }
  }, "DosePair v3 \xB7 drug data from RxNorm, DailyMed, RxNav and OpenFDA \xB7 research from PubMed and ClinicalTrials.gov."), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, "session b4f2\u202691ce \xB7 llm: groq \u2192 claude haiku fallback")), /*#__PURE__*/React.createElement(Disclaimer, null));
}
Object.assign(__ds_scope, { SettingsScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dosepair_web/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.CacheDot = __ds_scope.CacheDot;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Disclaimer = __ds_scope.Disclaimer;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.TagInput = __ds_scope.TagInput;

__ds_ns.TopNav = __ds_scope.TopNav;

__ds_ns.AnalyzerScreen = __ds_scope.AnalyzerScreen;

__ds_ns.HistoryScreen = __ds_scope.HistoryScreen;

__ds_ns.HomeScreen = __ds_scope.HomeScreen;

__ds_ns.ResearchScreen = __ds_scope.ResearchScreen;

__ds_ns.PlasmaChart = __ds_scope.PlasmaChart;

__ds_ns.InteractionList = __ds_scope.InteractionList;

__ds_ns.InsightsList = __ds_scope.InsightsList;

__ds_ns.ScheduleTimeline = __ds_scope.ScheduleTimeline;

__ds_ns.PKTable = __ds_scope.PKTable;

__ds_ns.SettingsScreen = __ds_scope.SettingsScreen;

})();
