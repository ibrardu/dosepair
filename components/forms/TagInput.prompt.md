Pill-shaped homepage drug search — typed names become removable chips; glows accent blue on focus.

```jsx
const { TagInput } = window.DosePairDesignSystem_7db6c7;
const [drugs, setDrugs] = React.useState(["Warfarin"]);
<TagInput tags={drugs} onChange={setDrugs} suggestions={["Aspirin", "Atorvastatin"]} onSubmit={analyze} />
```

- 56px pill, max-width 640px, `--glow-search` on focus
- `+` / `,` / Enter confirms text into a chip; Backspace on empty pops last chip
- `maxTags`: 15 desktop / 5 mobile (product rule)
