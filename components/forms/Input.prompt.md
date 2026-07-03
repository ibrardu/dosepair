Standard DosePair text field — uppercase mono label, accent focus glow.

```jsx
const { Input } = window.DosePairDesignSystem_7db6c7;
<Input label="Dose" placeholder="5mg" mono />
<Input label="Disease / condition" placeholder="e.g. HIV" hint="Optional — unlocks the research panel" />
```

- `mono` for doses, times, API keys
- All native input props pass through (`value`, `onChange`, `placeholder`, …)
