DosePair button for all clickable actions — one primary per view, secondary for everything else.

```jsx
const { Button } = window.DosePairDesignSystem_7db6c7;
<Button onClick={run}>Analyze Interactions</Button>
<Button variant="secondary" size="sm">Re-analyze</Button>
<Button variant="danger">Clear history</Button>
```

- `variant`: `primary` | `secondary` | `ghost` | `danger`
- `size`: `sm` (32px) | `md` (40px) | `lg` (48px — homepage CTA)
- `fullWidth`, `disabled`, `icon` (leading node)
