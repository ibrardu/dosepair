Fixed dark top nav — wordmark left, 5 page links right, accent underline on active.

```jsx
const { TopNav } = window.DosePairDesignSystem_7db6c7;
<TopNav active="analyze" onNavigate={setPage} logoSrc="assets/logo.svg" />
```

Defaults to the five product pages; pass `links` to override.
