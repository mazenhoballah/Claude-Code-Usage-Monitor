# Theme Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Light / Dark / System theme toggle to the Claude Monitor client, with the choice persisted across reloads and no flash of the wrong theme on first paint.

**Architecture:** CSS custom properties hold the actual color values, switched via `data-theme` on `<html>`. The existing `theme.ts` object keeps its shape and import paths but its `color.*` values become `var(--…)` references, so existing component code is untouched. A small React Context exposes the current mode and a `cycle()` action to a new icon button in the TopBar. An inline script in `index.html` resolves the persisted mode synchronously before React mounts to prevent FOUC.

**Tech Stack:** React 18, TypeScript, Vite, `lucide-react`. No test framework is configured in the client; verification is manual + `tsc -b` type-check + `vite build` smoke test.

**Spec:** `docs/specs/2026-05-04-theme-switching-design.md`

---

## File Structure

- `client/src/theme.ts` — modify: replace literal `color.*` hex values with `var(--…)` references; types unchanged.
- `client/src/styles/global.css` — modify: add `:root` (light) and `[data-theme="dark"]` blocks defining the variables; replace hardcoded `body` colors with variable references.
- `client/index.html` — modify: add inline FOUC-prevention `<script>` in `<head>`.
- `client/src/lib/theme-mode.tsx` — create: `ThemeMode` type, `STORAGE_KEY`, `<ThemeModeProvider>`, `useThemeMode()`, internal helpers for storage I/O and resolution.
- `client/src/components/ThemeToggle.tsx` — create: icon-only button reading `useThemeMode()`, calling `cycle()` on click.
- `client/src/components/TopBar.tsx` — modify: render `<ThemeToggle />` in the right-hand cluster, before the active-session badge.
- `client/src/main.tsx` — modify: wrap `<App />` in `<ThemeModeProvider>`.

Each task below produces a self-contained, type-checking commit.

---

### Task 1: Replace `theme.ts` literal colors with CSS-variable references

**Files:**

- Modify: `client/src/theme.ts`

- [ ] **Step 1: Rewrite the `color` block to reference CSS variables**

Replace lines 2–13 of `client/src/theme.ts` so the file reads exactly:

```ts
export const theme = {
  color: {
    bg: 'var(--color-bg)',
    surface: 'var(--color-surface)',
    surfaceHi: 'var(--color-surface-hi)',
    border: 'var(--color-border)',
    text: 'var(--color-text)',
    muted: 'var(--color-muted)',
    positive: 'var(--color-positive)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    accent: 'var(--color-accent)',
  },
  font: {
    mono: '"Fira Code", ui-monospace, monospace',
    sans: '"Fira Sans", system-ui, sans-serif',
  },
  radius: { sm: 6, md: 10, lg: 16 },
  shadow: {
    glow: '0 0 12px rgba(59, 130, 246, 0.25)',
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
  },
  transition: '150ms ease-out',
} as const;

export type Theme = typeof theme;
```

`font`, `radius`, `shadow`, `transition` are unchanged. Only `color.*` values change.

- [ ] **Step 2: Type-check**

Run: `cd client && npx tsc -b`
Expected: exits 0 with no output. (`as const` keeps the values as string literal types; consumers using them as `string` continue to compile.)

- [ ] **Step 3: Visually confirm the app is now untheme'd (expected breakage)**

Run: `cd client && yarn dev` (or `npm run dev`).
Open the URL Vite prints. Expected: the page renders unstyled / black-on-white because the CSS variables are not defined yet. This confirms tokens now flow through CSS. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add client/src/theme.ts
git commit -m "refactor(client/theme): route color tokens through CSS variables"
```

---

### Task 2: Define light and dark variable values in `global.css`

**Files:**

- Modify: `client/src/styles/global.css`

- [ ] **Step 1: Replace the file contents**

Overwrite `client/src/styles/global.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

:root,
[data-theme='light'] {
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-hi: #f1f5f9;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-muted: #64748b;
  --color-positive: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-accent: #3b82f6;
}

[data-theme='dark'] {
  --color-bg: #020617;
  --color-surface: #0f172a;
  --color-surface-hi: #1e293b;
  --color-border: #1e293b;
  --color-text: #f8fafc;
  --color-muted: #94a3b8;
  --color-positive: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-accent: #3b82f6;
}

* {
  box-sizing: border-box;
}
html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: 'Fira Sans', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.mono {
  font-family: 'Fira Code', ui-monospace, monospace;
}

button {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}
button:focus-visible,
a:focus-visible,
[role='button']:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }
}
```

Notes:

- Light is at `:root`, matching the spec's "default to light" decision.
- The `body` rule now uses `var(--color-bg)` / `var(--color-text)`.
- The focus ring color is also routed through `var(--color-accent)` so it stays correct in both modes.

- [ ] **Step 2: Verify the app renders in light mode**

Run: `cd client && yarn dev`.
Open the page. Expected: the app renders with **light** neutrals (white surfaces, dark text). Accent blue, positive green, warning amber, danger red are unchanged. No `data-theme` attribute is set on `<html>` yet — the `:root` defaults are doing the work.

- [ ] **Step 3: Verify dark mode by setting the attribute manually**

In DevTools console, run:

```js
document.documentElement.dataset.theme = 'dark';
```

Expected: the app instantly switches to the dark palette (matches the previous look). Run `delete document.documentElement.dataset.theme` to revert; the app returns to light. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add client/src/styles/global.css
git commit -m "feat(client/styles): define light + dark theme variables"
```

---

### Task 3: Create `theme-mode` module (Context, hook, provider, cycle)

**Files:**

- Create: `client/src/lib/theme-mode.tsx`

- [ ] **Step 1: Create the file**

Create `client/src/lib/theme-mode.tsx` with exactly this content:

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const STORAGE_KEY = 'cm.themeMode';

type ThemeModeContextValue = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (next: ThemeMode) => void;
  cycle: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // localStorage unavailable; fall through
  }
  return 'light';
}

function writeStoredMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable; ignore
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

const NEXT: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolve(readStoredMode()),
  );

  // Apply resolved theme to <html data-theme=…> whenever it changes.
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  // Re-resolve when mode changes.
  useEffect(() => {
    setResolved(resolve(mode));
  }, [mode]);

  // While in 'system', live-track OS theme changes.
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    writeStoredMode(next);
    setModeState(next);
  }, []);

  const cycle = useCallback(() => {
    setModeState((prev) => {
      const next = NEXT[prev];
      writeStoredMode(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, resolved, setMode, cycle }),
    [mode, resolved, setMode, cycle],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx)
    throw new Error('useThemeMode must be used within <ThemeModeProvider>');
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `cd client && npx tsc -b`
Expected: exits 0 with no output.

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/theme-mode.tsx
git commit -m "feat(client/lib): add theme-mode context, hook, and cycle"
```

---

### Task 4: Wire `<ThemeModeProvider>` in `main.tsx`

**Files:**

- Modify: `client/src/main.tsx`

- [ ] **Step 1: Wrap `<App />` with the provider**

Replace `client/src/main.tsx` contents with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './App';
import { ThemeModeProvider } from './lib/theme-mode';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');
createRoot(root).render(
  <StrictMode>
    <ThemeModeProvider>
      <App />
    </ThemeModeProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Type-check**

Run: `cd client && npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Visually confirm the provider applies a theme**

Run: `cd client && yarn dev`. Open the page.
Expected: app renders in light mode (default), and inspecting `<html>` shows `data-theme="light"` (set by the provider's effect). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add client/src/main.tsx
git commit -m "feat(client/main): mount ThemeModeProvider"
```

---

### Task 5: Add the FOUC-prevention inline script to `index.html`

**Files:**

- Modify: `client/index.html`

- [ ] **Step 1: Add the inline script**

Replace `client/index.html` contents with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Monitor</title>
    <script>
      (function () {
        try {
          var m = localStorage.getItem('cm.themeMode') || 'light';
          var resolved =
            m === 'system'
              ? matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
              : m === 'dark'
                ? 'dark'
                : 'light';
          document.documentElement.dataset.theme = resolved;
        } catch (_) {
          document.documentElement.dataset.theme = 'light';
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

The storage key string `'cm.themeMode'` matches `STORAGE_KEY` in `theme-mode.tsx`. The script must stay before the module script so `<html>` has the right attribute before stylesheets resolve `var(--…)`.

- [ ] **Step 2: Verify FOUC prevention**

Run: `cd client && yarn dev`. Open the page. In DevTools console:

```js
localStorage.setItem('cm.themeMode', 'dark');
location.reload();
```

Expected: the page reloads and paints **directly** in dark mode — no white flash.

Then:

```js
localStorage.setItem('cm.themeMode', 'system');
location.reload();
```

Expected: paints in whichever mode matches the OS, no flash. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add client/index.html
git commit -m "feat(client/html): inline pre-mount theme resolution to prevent FOUC"
```

---

### Task 6: Build the `<ThemeToggle />` component

**Files:**

- Create: `client/src/components/ThemeToggle.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/ThemeToggle.tsx` with:

```tsx
import { Moon, Monitor, Sun } from 'lucide-react';
import { useState } from 'react';
import { useThemeMode } from '../lib/theme-mode';
import type { ThemeMode } from '../lib/theme-mode';
import { theme } from '../theme';

const NEXT_LABEL: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export function ThemeToggle() {
  const { mode, resolved, cycle } = useThemeMode();
  const [hover, setHover] = useState(false);

  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  const label =
    mode === 'system'
      ? `Theme: system (resolved: ${resolved}). Switch to ${NEXT_LABEL[mode]}.`
      : `Theme: ${mode}. Switch to ${NEXT_LABEL[mode]}.`;

  return (
    <button
      type='button'
      onClick={cycle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label}
      title={label}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.sm,
        background: hover ? theme.color.surfaceHi : 'transparent',
        color: theme.color.text,
        transition: theme.transition,
      }}>
      <Icon size={16} />
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd client && npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ThemeToggle.tsx
git commit -m "feat(client/components): add ThemeToggle button"
```

---

### Task 7: Render `<ThemeToggle />` in the TopBar

**Files:**

- Modify: `client/src/components/TopBar.tsx`

- [ ] **Step 1: Update TopBar to render the toggle**

Replace `client/src/components/TopBar.tsx` contents with:

```tsx
import { Activity } from 'lucide-react';
import { Badge } from './ui/Badge';
import { ThemeToggle } from './ThemeToggle';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatRelative } from '../lib/format';

export function TopBar({ stats }: { stats: Stats | null }) {
  const a = stats?.activeSession;
  return (
    <div
      style={{
        position: 'sticky',
        top: 16,
        zIndex: 10,
        margin: '16px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.color.surface,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadow.card,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity size={18} color={theme.color.accent} />
        <strong style={{ fontFamily: theme.font.sans, fontSize: 15 }}>
          Claude Monitor
        </strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ThemeToggle />
        {a ? (
          <Badge tone='accent'>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: theme.color.positive,
                display: 'inline-block',
              }}
            />
            active: {a.project} · last event {formatRelative(a.lastEventAt)}
          </Badge>
        ) : (
          <Badge tone='muted'>no active session</Badge>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd client && npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/TopBar.tsx
git commit -m "feat(client/topbar): render ThemeToggle next to active-session badge"
```

---

### Task 8: End-to-end manual verification

This task has no code; it walks the spec's manual test plan to confirm the feature is complete.

- [ ] **Step 1: Clean state, dev server up**

Run: `cd client && yarn dev`.
In DevTools, run `localStorage.removeItem('cm.themeMode')`, then reload.
Expected: light mode renders. `<html>` has `data-theme="light"`.

- [ ] **Step 2: Toggle to dark, reload**

Click the sun icon. Expected: icon becomes a moon, palette becomes dark, `<html data-theme="dark">`. Reload. Expected: dark on first paint, no white flash.

- [ ] **Step 3: Toggle to system, flip OS theme**

Click again. Expected: icon becomes a monitor; palette matches OS. Flip the OS appearance (System Settings → Appearance, or `prefers-color-scheme` emulation in DevTools). Expected: app palette flips live without a reload.

- [ ] **Step 4: Toggle back to light, reload**

Click again. Expected: icon becomes a sun, palette light, persisted (verify via reload).

- [ ] **Step 5: localStorage blocked**

In DevTools → Application → Storage, block site data (or run in a Brave/Firefox private window with storage disabled). Reload. Expected: app loads in light mode, toggle still cycles within the session, no errors in the console.

- [ ] **Step 6: Keyboard accessibility**

Tab into the page. Expected: ThemeToggle receives a visible focus ring. Press Enter, then Space — each should advance the cycle.

- [ ] **Step 7: Sweep every panel in both modes**

In light mode, scroll through the app and confirm each panel is legible and matches the design intent: TopBar, SummaryCards, SessionList, SessionDetail, ContextPanel, PrePromptTips. Toggle to dark and repeat. Expected: no unreadable text, no invisible borders, accent / positive / warning / danger unchanged.

- [ ] **Step 8: Production build smoke test**

Stop the dev server. Run: `cd client && yarn build`.
Expected: exits 0, `dist/` is regenerated. Then `cd client && yarn preview` and repeat the toggle in the preview server.

- [ ] **Step 9: Final commit (if anything was tweaked)**

If steps 1–8 surfaced a small fix (e.g., a light-mode contrast nit), commit it now:

```bash
git add -p
git commit -m "fix(client/theme): <describe the tweak>"
```

If no tweaks were needed, skip this step.
