---
name: add-chart
description: Use when adding a new Recharts chart component to the dashboard. Encodes the exact Card + inline styles + theme vars + CSS vars pattern used by all existing charts.
---

# Add a New Chart Component

All charts live in `client/src/components/charts/`. They follow a strict pattern — inline styles only, no Tailwind, theme tokens from `theme.ts` and CSS vars.

## Checklist

1. **Create `client/src/components/charts/<ChartName>.tsx`**
   - Follow the exact structure below
   - Import from `recharts`, `../ui/Card`, `../../theme`, and `../../lib/types`

2. **Import and place in the target page**
   - Dashboard: `client/src/pages/DashboardPage.tsx` — add to a grid row
   - Other pages: import and render inline

3. **If the chart needs new data from the server**, run the `add-route` skill first

## Component Template

```tsx
import { /* Recharts components */ } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { Session } from '../../lib/types'; // or Stats, SessionDetail etc.

export function <ChartName>({ /* props */ }: { /* prop types */ }) {
  // data transformation logic here

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header row */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <span style={{
          fontFamily: theme.font.sans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: theme.color.muted,
        }}>
          Chart Title
        </span>
        <span style={{ fontSize: 11, color: theme.color.muted, fontFamily: theme.font.mono }}>
          subtitle / range
        </span>
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Recharts component here */}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
```

## Axis / Tooltip Styling (copy exactly)

```tsx
<XAxis
  dataKey="label"
  tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'Fira Code' }}
  axisLine={false}
  tickLine={false}
  dy={5}
/>
<YAxis
  tick={{ fontSize: 10, fill: 'var(--color-muted)', fontFamily: 'Fira Code' }}
  axisLine={false}
  tickLine={false}
  width={38}
/>
<Tooltip
  contentStyle={{
    background: 'var(--color-surface-hi)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'Fira Code',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  }}
  labelStyle={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 2 }}
  cursor={{ fill: 'var(--color-surface-hi)', opacity: 0.6 }}
/>
```

## Bar gradient (copy for bar charts)

```tsx
<defs>
  <linearGradient id="myGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="var(--chart-cost)" stopOpacity={1} />
    <stop offset="100%" stopColor="var(--chart-cost)" stopOpacity={0.45} />
  </linearGradient>
</defs>
<Bar dataKey="value" fill="url(#myGrad)" radius={[5, 5, 0, 0]} maxBarSize={52} />
```

## CSS color vars available

| Var | Use |
|-----|-----|
| `var(--color-text)` | Primary text |
| `var(--color-muted)` | Labels, subtitles |
| `var(--color-surface-hi)` | Tooltip background |
| `var(--color-border)` | Borders |
| `var(--chart-cost)` | Cost bars |
| `var(--chart-input)` | Input token color |
| `var(--chart-output)` | Output token color |
| `var(--chart-cache)` | Cache token color |

## Adding to DashboardPage grid

Row layout uses `gridTemplateColumns`. Current layout:
- Row 1: `'1fr 260px'` — wide chart + narrow donut
- Row 2: `'1fr 1fr'` — two equal charts

Adjust the `flex` weight (`flex: '1.1'` vs `flex: 1`) to control relative row height.

## Rules
- **No Tailwind, no CSS-in-JS** — inline styles with theme tokens only
- **No emoji icons** — use Lucide if icons are needed
- `null` prop means data is still loading — render a loading state or empty chart gracefully
