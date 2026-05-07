---
name: add-page
description: Use when adding a new tab and page to the claude-monitor dashboard. Covers all 3 touch-points: TopBar, App.tsx, and the new page file.
---

# Add a New Dashboard Page/Tab

Adding a page requires touching 3 files. The Tab type in `TopBar.tsx` is the single source of truth for valid tab names.

## Checklist (do in order)

1. **Create `client/src/pages/<Name>Page.tsx`**
   - Scrollable content pages (tips, info, docs): just return a `<div>` with content
   - Data-driven pages: accept `{ stats, sessions }` props from App
   - See layout rules below

2. **Add the tab to `client/src/components/TopBar.tsx`**
   - Add the literal string to the `Tab` union type
   - Add a tab button entry to the tabs array/map inside the component

3. **Register in `client/src/App.tsx`**
   - Import the new page
   - If it's a scrollable page (long content, no fixed height charts): add the tab name to the `scrollable` check
   - Add a conditional render: `{activeTab === '<tab-name>' && <NamePage ... />}`

## Page Layout Rules

**Fixed-height dashboard pages** (charts that fill the viewport — like DashboardPage):
```tsx
export function MyPage({ stats, sessions }: { stats: Stats | null; sessions: Session[] | null }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14, boxSizing: 'border-box' }}>
      {/* content fills available height */}
    </div>
  );
}
```
Do NOT add this tab name to the `scrollable` set in `App.tsx`.

**Scrollable content pages** (tips, docs, formulas — long vertical content):
```tsx
export function MyPage() {
  return (
    <div style={{ maxWidth: 800 }}>
      {/* long content */}
    </div>
  );
}
```
Add this tab name to the `scrollable` check in `App.tsx`:
```ts
const scrollable = activeTab === 'tips' || activeTab === 'formulas' || activeTab === 'my-tab';
```

## Tab Type Pattern (TopBar.tsx)

```ts
// Extend the union — keep alphabetical
export type Tab = 'dashboard' | 'formulas' | 'my-tab' | 'sessions' | 'tips' | 'whats-new';
```

## Rules
- Inline styles only — no Tailwind
- Lucide icons only — no emoji
- If the page needs live data, it comes from App's existing `usePoll` calls — do not add new polling inside a page
- If the page needs data not yet polled in App, add a new `usePoll` in `App.tsx` and pass it down as a prop
