# Theme Switching (Light / Dark / System) — Design

Date: 2026-05-04
Scope: `client/`

## Goal

Let the user switch the Claude Monitor UI between a light palette, a dark
palette, and an OS-following "system" mode, from a single icon button in the
TopBar. The choice persists across reloads. The first paint must already match
the persisted choice (no flash of the wrong theme).

## Non-goals

- No tuned light values for `accent`, `positive`, `warning`, `danger` — these
  stay as the existing dark-mode hex values in both modes (direct inversion of
  neutrals only).
- No per-component theme overrides or extra variants beyond light / dark.
- No animated transition between modes.
- No cross-tab sync via `storage` events.
- No SSR considerations (Vite SPA only).

## Default behavior

- First load with empty `localStorage` → **light** mode.
- Toggle cycles **Light → Dark → System → Light**.
- `system` mode resolves via `matchMedia('(prefers-color-scheme: dark)')` and
  updates live when the OS theme changes.

## Architecture

CSS variables hold the actual color values. The existing `theme.ts` object
keeps the same shape and import path, but its `color.*` values become CSS
variable references (`var(--color-surface)` etc.). Component code that does
`style={{ background: theme.color.surface }}` continues to work unchanged.

A small React Context exposes the current mode and a `cycle()` action to the
toggle button. The provider sets `document.documentElement.dataset.theme` to
the *resolved* mode (`'light'` or `'dark'`) whenever it changes.

To prevent a flash of light-mode paint when the persisted mode is `dark`, an
inline script in `client/index.html` sets `data-theme` synchronously before
React mounts.

## Token model

`client/src/theme.ts` — color values become CSS-variable references; everything
else stays as literals:

```ts
color: {
  bg:        'var(--color-bg)',
  surface:   'var(--color-surface)',
  surfaceHi: 'var(--color-surface-hi)',
  border:    'var(--color-border)',
  text:      'var(--color-text)',
  muted:     'var(--color-muted)',
  positive:  'var(--color-positive)',
  warning:   'var(--color-warning)',
  danger:    'var(--color-danger)',
  accent:    'var(--color-accent)',
}
```

`font`, `radius`, `shadow`, `transition` remain literal values.
`shadow.card` keeps its current dark-tuned value in both modes for v1.

`client/src/styles/global.css` — define the actual values. Light is the
default at `:root`; dark is opted in via `[data-theme="dark"]` on `<html>`:

```css
:root, [data-theme="light"] {
  --color-bg:         #F8FAFC;
  --color-surface:    #FFFFFF;
  --color-surface-hi: #F1F5F9;
  --color-border:     #E2E8F0;
  --color-text:       #0F172A;
  --color-muted:      #64748B;
  --color-positive:   #22C55E;
  --color-warning:    #F59E0B;
  --color-danger:     #EF4444;
  --color-accent:     #3B82F6;
}
[data-theme="dark"] {
  --color-bg:         #020617;
  --color-surface:    #0F172A;
  --color-surface-hi: #1E293B;
  --color-border:     #1E293B;
  --color-text:       #F8FAFC;
  --color-muted:      #94A3B8;
  --color-positive:   #22C55E;
  --color-warning:    #F59E0B;
  --color-danger:     #EF4444;
  --color-accent:     #3B82F6;
}
body { background: var(--color-bg); color: var(--color-text); }
```

The hardcoded `background: #020617; color: #F8FAFC;` on `body` in
`global.css` is removed (replaced by the variables above).

## Mode state & persistence

New file: `client/src/lib/theme-mode.tsx`

- `type ThemeMode = 'light' | 'dark' | 'system'`
- Storage key: `cm.themeMode` in `localStorage`.
- `resolved: 'light' | 'dark'` — for `mode === 'system'`, derived from
  `matchMedia('(prefers-color-scheme: dark)').matches`; otherwise equals
  `mode`.
- Effect: writes `document.documentElement.dataset.theme = resolved` whenever
  `resolved` changes.
- System listener: when `mode === 'system'`, subscribe to the media query's
  `change` event and re-resolve. Unsubscribe when mode changes away from
  `system` or on unmount.
- `<ThemeModeProvider>` reads initial mode from `localStorage` (fallback
  `'light'`), exposes `{ mode, resolved, setMode, cycle }` via Context, and
  writes the new value to `localStorage` on `setMode` / `cycle`.
- `useThemeMode()` returns the context value; throws if used outside the
  provider.
- `cycle()` advances Light → Dark → System → Light.

`localStorage` access is wrapped in `try/catch`; if storage is unavailable, the
provider falls back to in-memory state and never throws. An invalid stored
string is treated as if storage were empty (default `'light'`).

## FOUC prevention

`client/index.html` — an inline `<script>` placed in `<head>` before any
stylesheet/module:

```html
<script>
  try {
    var m = localStorage.getItem('cm.themeMode') || 'light';
    var resolved = m === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : (m === 'dark' ? 'dark' : 'light');
    document.documentElement.dataset.theme = resolved;
  } catch (_) {
    document.documentElement.dataset.theme = 'light';
  }
</script>
```

The provider's effect re-asserts the same value on mount, so the script and
the provider stay consistent.

## Toggle button & wiring

New file: `client/src/components/ThemeToggle.tsx`

- Icon-only button, ~28×28, no border, hover `background: theme.color.surfaceHi`,
  focus ring inherits the existing `:focus-visible` style from `global.css`.
- Reads `{ mode, resolved, cycle }` from `useThemeMode()`.
- Icon (from `lucide-react`):
  - `mode === 'light'` → `Sun`
  - `mode === 'dark'` → `Moon`
  - `mode === 'system'` → `Monitor`
- `onClick` → `cycle()`.
- `aria-label` and `title` reflect current mode and next action, e.g.:
  - `"Theme: light. Switch to dark."`
  - `"Theme: dark. Switch to system."`
  - `"Theme: system (resolved: dark). Switch to light."`

`client/src/components/TopBar.tsx` — render `<ThemeToggle />` in the right-hand
cluster, **before** the active-session `Badge`, with an 8px gap; same vertical
alignment as the badge.

`client/src/main.tsx` — wrap `<App />` with `<ThemeModeProvider>`.

## Files touched

- `client/src/theme.ts` — color values become `var(--…)` references.
- `client/src/styles/global.css` — add `:root` and `[data-theme="dark"]`
  blocks; replace hardcoded body bg/color with variables.
- `client/index.html` — add FOUC-prevention inline script.
- `client/src/lib/theme-mode.tsx` — **new**, provider + hook + cycle.
- `client/src/components/ThemeToggle.tsx` — **new**, icon button.
- `client/src/components/TopBar.tsx` — render `<ThemeToggle />`.
- `client/src/main.tsx` — wrap with `<ThemeModeProvider>`.

## Manual test plan

1. First load with empty `localStorage` → light mode rendered.
2. Click toggle → dark; refresh → still dark; no flash of light on reload.
3. Click again → system; with OS in dark, app is dark; flip OS to light, app
   flips live without reload.
4. Click again → light; refresh → still light.
5. Block `localStorage` (DevTools → disable storage) → toggle still cycles
   within the session, no errors logged.
6. Keyboard: Tab to toggle, focus ring visible, Enter and Space both activate
   it.
7. Visit each panel (TopBar, SummaryCards, SessionList, SessionDetail,
   ContextPanel, PrePromptTips) in both modes — neutrals invert, accent /
   positive / warning / danger unchanged, no contrast regressions.
