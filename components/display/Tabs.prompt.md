Accent-underline tabs — research panel sections, with optional result counts.

```jsx
const { Tabs } = window.DosePairDesignSystem_7db6c7;
<Tabs
  tabs={[{ id: "trials", label: "Clinical Trials", count: 12 }, { id: "pubmed", label: "PubMed Papers", count: 48 }, { id: "fda", label: "FDA Approvals", count: 3 }]}
  active={tab} onChange={setTab}
/>
```
