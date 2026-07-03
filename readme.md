# DosePair Design System

**See how your medications interact — before they do.**

DosePair is a drug-interaction analyzer for patients on multiple medications, caregivers, pharmacists, and clinicians. Users search a drug combination and get a 24-hour plasma-level plot, severity-ranked interaction cards, prioritized insights, an optimized dosing schedule, and an optional disease-research panel (clinical trials, PubMed, FDA approvals).

## Product surfaces

One product: the **DosePair web app** (Next.js on Vercel, dark-only UI). Five pages:

| Page | Route | Purpose |
|---|---|---|
| Home / Search | `/` | Google-style search: type drugs, get instant combo interaction |
| Analyzer | `/analyze` | Structured input: medication rows + dose + time + route + disease |
| Research | `/research` | Disease → clinical trials + PubMed + FDA approvals |
| History | `/history` | Past analyses by session UUID |
| Settings | `/settings` | API keys, theme, disclaimer, about |

Results render as a fixed panel sequence: summary → 24h chart → interaction cards → insights → recommended schedule → research → PK table → **medical disclaimer (always last, non-negotiable)**.

## Sources

- **DosePair Drug Interaction Analyzer Skill v3** — product spec pasted into this project (sole source). It defines the exact color palette, page layouts, component behaviors, API contract, and code-generation rules. No Figma file, codebase, or brand-asset package was provided.
- Fonts and logo are **nearest-match substitutions** created for this system (see Caveats).

---

## CONTENT FUNDAMENTALS

- **Voice:** calm, clinical, direct. Second person ("your medications"), never first person plural marketing-speak. The product explains *mechanisms*, not vibes.
- **Casing:** sentence case everywhere — headings, buttons, labels. Exceptions: the wordmark "DosePair", drug proper names (Warfarin, Dovato), and all-caps mono micro-labels (`DOSE · TIME · ROUTE`).
- **Button copy:** verb-first imperatives — "Analyze Interactions", "Re-analyze", "Clear history", "Export .ics". Short, no punctuation.
- **Placeholders teach by example:** `Search drug combinations... e.g. "Warfarin + Aspirin"`, `e.g. HIV`.
- **Insights follow a strict shape:** statement → *why* (mechanism) → optional "Take action →". E.g. "Take tadalafil at least 2 hours before luteolin." / "Why: Luteolin moderately inhibits CYP3A4…".
- **Numbers are mono and precise:** `t½ 17.5h`, `peak +1.5h`, `rxcui 1191`. Never round away clinical meaning.
- **Hedging is deliberate:** "Possible increased exposure", "may be incomplete or incorrect". Certainty only where databases are certain.
- **No emoji, ever.** Severity is communicated with color-coded badges, not symbols.
- **Disclaimer is sacred copy:** "Not medical advice." leads, amber-bordered, last element on every results view.

## VISUAL FOUNDATIONS

- **Color:** dark-only. Near-black blue page (`#0F1117`), one card surface (`#181C27`), borders (`#252A3A`) carry hierarchy — shadows are minimal. One accent (blue `#4F8EF7`) for actions/active nav/focus. A strict 3-step severity scale: red `#E05C4B` / amber `#E09A3A` / green `#3DBD8A`. Research content is teal `#2DD4BF`. Purple/pink exist **only** as data-viz curve colors (`--plot-1…6`). Color-on-dark fills are 14%-alpha tints of the same hues.
- **Type:** Space Grotesk (600/700, −0.02em on large sizes) for wordmark/titles; IBM Plex Sans (400/500/600) at 15px body, 1.55 line-height; IBM Plex Mono for every number, dose, time, RxCUI, badge, and uppercase field label (12px, 0.08em tracking). The mono layer is the brand's signature "clinical instrument" feel.
- **Spacing:** 4px grid (`--space-1…8`). Pages are single centered columns: 880px (content), 640px (search, settings).
- **Radii:** 6/10/14px; **chips and the search field are always full pills**. Search input: 56px tall, 640px max.
- **Backgrounds:** flat color. The homepage alone gets a 24px dot-grid texture at 18% alpha, radially masked behind the search lockup. No gradients, no imagery, no illustration.
- **Elevation:** `--shadow-card` (barely there) → `--shadow-lift` (chip hover) → `--shadow-modal`. Focus = accent glow `0 0 0 3px rgba(79,142,247,.2)`; the search field gets the larger `--glow-search`.
- **Motion:** fast and quiet — 120–200ms, `cubic-bezier(.2,.8,.2,1)`. Hover: chips lift −1px with shadow; buttons lighten (`--accent-hover`); nav links brighten text only. Press: darken (`--accent-press`). No bounces, no infinite loops; canvas chart draws instantly.
- **Cards:** surface + 1px border + 14px radius + minimal shadow. Accent-colored border *replaces* the default border for special panels (amber disclaimer) — never a left-border-only stripe.
- **Transparency/blur:** only the fixed top nav (92% surface + 12px backdrop blur).
- **Data-viz:** curves 2.2px in plot-order colors; severity bands as 12%-alpha rectangles behind curves; peak dots + mono labels; dashed verticals for schedule markers (green = recommended, grey = current).

## ICONOGRAPHY

- **System:** [Lucide](https://lucide.dev) via CDN (`https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js`), 2px stroke, 16–20px, drawn in `--text-secondary` grey. This is a **substitution** — the spec names no icon set; Lucide's thin clinical strokes match the mono-label aesthetic. No icon font is bundled.
- **Semantic color only for meaning:** `triangle-alert` amber, `octagon-alert` red, `circle-check` green, `lightbulb` blue (tips), `microscope`/`flask-conical` teal (research).
- **Core set:** search, pill, flask-conical, history, settings, clock, calendar-plus, download, copy, refresh-cw, x, plus.
- **Two inline SVG exceptions** (kept dependency-free inside components): the search glass in `TagInput`, the warning triangle in `Disclaimer` — both traced from Lucide paths.
- **No emoji, no unicode-glyph icons.** The only typographic "icons" are × (dismiss) and ▾ (select caret).
- **Logo:** `assets/logo.svg` — two overlapping capsules rotated 45°, blue + teal with a green overlap (cache/safety motif). Placeholder mark; replace when a real logo exists.

---

## Index

| Path | What's there |
|---|---|
| `styles.css` | Global entry — imports all tokens + fonts |
| `tokens/` | `colors.css`, `typography.css`, `spacing.css`, `fonts.css` (@font-face) |
| `assets/` | `logo.svg`, `fonts/` (woff2 binaries) |
| `guidelines/` | 13 specimen cards: colors ×4, type ×3, spacing ×3, brand ×3 |
| `components/actions/` | **Button** |
| `components/forms/` | **Input, Select, Switch, TagInput** (drug search) |
| `components/display/` | **Card, Badge, Chip, CacheDot, Tabs** |
| `components/navigation/` | **TopNav** |
| `components/feedback/` | **Disclaimer** |
| `ui_kits/dosepair_web/` | Interactive 5-page app recreation (`index.html`) + screen JSX |
| `SKILL.md` | Agent-skill entry point |

Component namespace: `window.DosePairDesignSystem_7db6c7` (load `_ds_bundle.js`). Each component ships `.jsx` + `.d.ts` + `.prompt.md`.

## Caveats

- **Fonts:** spec named no typefaces. Space Grotesk / IBM Plex Sans / IBM Plex Mono are Google Fonts substitutions, self-hosted in `assets/fonts/`. Provide brand font files to replace.
- **Logo:** placeholder capsule mark — no brand logo was provided.
- **Light theme:** Settings exposes a theme toggle in the product spec, but the design system is currently dark-only; light tokens are undefined.
- All UI-kit data (drugs, trials, papers, stats) is mock/illustrative.
