# DosePair Web — UI Kit

Interactive recreation of the five-page DosePair web app, composed entirely from the design-system primitives (`window.DosePairDesignSystem_7db6c7`).

- `index.html` — app shell: TopNav + page switching. Open this.
- `HomeScreen.jsx` — Google-style search: tag-input, quick combos, recent searches, hero stats, dot-grid texture.
- `AnalyzerScreen.jsx` — medication rows + disease field; inline results (summary, canvas chart, interactions, insights, schedule, PK table, disclaimer). Contains the mock PK/interaction database.
- `ResultsPanels.jsx` — PlasmaChart (canvas, 3 layers), InteractionList, InsightsList, ScheduleTimeline (SVG), PKTable.
- `ResearchScreen.jsx` — disease search + trials/PubMed/FDA tabs with cache-age indicator.
- `HistoryScreen.jsx` — session history rows with severity badges + re-analyze.
- `SettingsScreen.jsx` — connection, appearance, data, about.

Everything is mock data — no network calls. Try: click a quick combo on Home (e.g. "Warfarin + Aspirin") → full results render on the Analyzer page.
