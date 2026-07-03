---
name: dosepair-design
description: Use this skill to generate well-branded interfaces and assets for DosePair (drug-interaction analyzer) across web, iOS, and Android — production code or throwaway prototypes. Contains color tokens, typography, component library, and full UI kit recreations for all three platforms.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Key design facts

- **Dark-first UI:** page `#0F1117`, card `#181C27`, border `#252A3A`, accent blue `#4F8EF7`
- **Severity:** high `#E05C4B` (red) · moderate `#E09A3A` (amber) · low `#3DBD8A` (green)
- **Drug curve colors (ordered):** `#4F8EF7`, `#E05C4B`, `#3DBD8A`, `#E09A3A`, `#C084FC`, `#F472B6`
- **Type:** Inter or system-ui. 14px body, 13px secondary, 11px uppercase labels (letter-spacing 0.05em), 18px headings
- **Radius:** 12px cards, 8px inputs, 20px chips/badges/pills
- **Input height:** 44px desktop, 52px mobile
- All tokens in `tokens/*.css`, linked via `styles.css`

## Platform rules

| Platform | Framework | Max meds | Notes |
|---|---|---|---|
| Web | Next.js + Tailwind | 15 | Desktop-first |
| Android | Jetpack Compose | 5 | MVVM + Repository |
| iOS | SwiftUI | 5 | MVVM + async/await |
| Backend | Express + Node.js | — | API key server-side only, never client |

## Always apply

1. API key stays server-side — client calls `/api/analyze`, never Anthropic directly
2. Canvas chart from scratch — no third-party chart libraries
3. Medical disclaimer last on every results view — non-negotiable
4. Sentence case everywhere, no emoji
5. Lucide icons, 2px stroke weight
6. Strip empty medication rows before submit; enforce row limits in UI and backend
7. Loading state, error state, empty state on every screen
8. History on-device only — never persist to server

## File map

- `styles.css` — global entry point importing all token files
- `tokens/` — CSS custom properties (colors, type, spacing)
- `components/` — React primitives (Button, Input, Card, Badge, Chip, etc.)
- `ui_kits/dosepair_web/` — full interactive web app (5 screens)
- `ui_kits/dosepair_ios/` — full interactive iOS prototype (5 screens, bottom tabs)
- `ui_kits/dosepair_android/` — full interactive Android prototype (5 screens, bottom nav)
- `assets/` — logo, icons, fonts
