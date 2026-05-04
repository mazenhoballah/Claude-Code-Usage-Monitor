import { AlertTriangle, Info, Snowflake, Flame } from 'lucide-react';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatPct } from '../lib/format';

export function PrePromptTips({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const a = stats.activeSession;

  if (!a) {
    return (
      <Card style={{ margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.color.muted }}>
          <Info size={16} /> Start a Claude Code session to see live pre-prompt insights here.
        </div>
      </Card>
    );
  }

  const ctxPct = a.contextPct;
  const ctxTone = ctxPct < 0.5 ? 'positive' : ctxPct < 0.8 ? 'warning' : 'danger';
  // Cache warmth: heuristic — if hit rate > 0.6 and there were recent turns, "warm".
  const warm = stats.cache.hitRate > 0.6;

  const tips: { icon: React.ReactNode; text: string }[] = [];
  if (ctxPct > 0.7) tips.push({ icon: <AlertTriangle size={14} color={theme.color.warning} />, text: 'Context > 70% — consider /clear before your next big task.' });
  if (ctxPct > 0.9) tips.push({ icon: <AlertTriangle size={14} color={theme.color.danger} />, text: 'Context > 90% — risk of compaction. Save important state and /clear.' });
  if (!warm) tips.push({ icon: <Snowflake size={14} color={theme.color.accent} />, text: 'Cache cold — your next prompt will pay full input price.' });
  if (warm && ctxPct < 0.7) tips.push({ icon: <Flame size={14} color={theme.color.positive} />, text: 'Cache warm and context healthy — cheap follow-ups expected.' });

  return (
    <Card style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
            <span style={{ color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>Active context</span>
            <span className="mono" style={{ fontSize: 16 }}>{formatPct(ctxPct)}</span>
          </div>
          <ProgressBar value={ctxPct} label={`context ${formatPct(ctxPct)}`} />
          <div style={{ marginTop: 6, fontSize: 12, color: theme.color.muted }}>
            session: <span className="mono">{a.sessionId.slice(0, 8)}</span> · {a.turns} turns · {a.project}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge tone={ctxTone}>context {formatPct(ctxPct)}</Badge>
          <Badge tone={warm ? 'positive' : 'accent'}>{warm ? 'cache warm' : 'cache cold'}</Badge>
        </div>
      </div>
      {tips.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tips.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.color.text }}>
              {t.icon} {t.text}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
