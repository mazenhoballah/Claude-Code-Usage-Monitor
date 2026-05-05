import type { CSSProperties, ReactNode } from 'react';
import { Card } from '../components/ui/Card';
import { theme } from '../theme';

function SectionHeader({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{
        width: 26, height: 26, borderRadius: '50%',
        background: theme.color.accent, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>{n}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: theme.color.text }}>{children}</span>
    </div>
  );
}

function FormulaBlock({ name, latex, desc, example }: { name: string; latex: string; desc: string; example?: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text, marginBottom: 6 }}>{name}</div>
      <div style={{
        fontFamily: theme.font.mono,
        fontSize: 13,
        padding: '10px 14px',
        background: 'var(--color-surface-hi)',
        borderLeft: `3px solid ${theme.color.accent}`,
        borderRadius: `0 ${theme.radius.sm}px ${theme.radius.sm}px 0`,
        color: theme.color.text,
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
      }}>{latex}</div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: theme.color.muted, lineHeight: 1.6 }}>{desc}</p>
      {example && (
        <div style={{
          marginTop: 8,
          padding: '8px 12px',
          background: 'var(--color-surface-hi)',
          borderRadius: theme.radius.sm,
          fontSize: 12,
          fontFamily: theme.font.mono,
          color: theme.color.muted,
          lineHeight: 1.8,
        }}>
          {example}
        </div>
      )}
    </div>
  );
}

function PricingTable() {
  const rows = [
    { model: 'Opus 4.7 [1M]',  input: '$30',  output: '$150', cw: '$37.50', cr: '$3.00',  ctx: '1M',   note: '1M context window' },
    { model: 'Opus 4.7',       input: '$15',  output: '$75',  cw: '$18.75', cr: '$1.50',  ctx: '200K', note: '' },
    { model: 'Opus 4.6',       input: '$15',  output: '$75',  cw: '$18.75', cr: '$1.50',  ctx: '200K', note: '' },
    { model: 'Sonnet 4.6',     input: '$3',   output: '$15',  cw: '$3.75',  cr: '$0.30',  ctx: '200K', note: 'default model' },
    { model: 'Haiku 4.5',      input: '$1',   output: '$5',   cw: '$1.25',  cr: '$0.10',  ctx: '200K', note: 'cheapest' },
  ];
  const th: CSSProperties = {
    fontWeight: 500, fontSize: 12, color: theme.color.muted, padding: '6px 12px 6px 0',
    textAlign: 'left', whiteSpace: 'nowrap',
  };
  const td: CSSProperties = {
    fontSize: 12, fontFamily: theme.font.mono, padding: '7px 12px 7px 0',
    color: theme.color.text,
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.color.border}` }}>
            <th style={th}>Model</th>
            <th style={{ ...th, textAlign: 'right' }}>$in /Mtok</th>
            <th style={{ ...th, textAlign: 'right' }}>$out /Mtok</th>
            <th style={{ ...th, textAlign: 'right' }}>$cw /Mtok</th>
            <th style={{ ...th, textAlign: 'right' }}>$cr /Mtok</th>
            <th style={{ ...th, textAlign: 'right' }}>Max ctx</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.model} style={{ borderTop: `1px solid ${theme.color.border}` }}>
              <td style={td}>
                <span>{r.model}</span>
                {r.note && <span style={{ marginLeft: 8, fontSize: 11, color: theme.color.muted }}>— {r.note}</span>}
              </td>
              <td style={{ ...td, textAlign: 'right', color: theme.color.accent }}>{r.input}</td>
              <td style={{ ...td, textAlign: 'right' }}>{r.output}</td>
              <td style={{ ...td, textAlign: 'right' }}>{r.cw}</td>
              <td style={{ ...td, textAlign: 'right', color: theme.color.positive }}>{r.cr}</td>
              <td style={{ ...td, textAlign: 'right', color: theme.color.muted }}>{r.ctx}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: '10px 0 0', fontSize: 11, color: theme.color.muted }}>
        Constant ratios: $out = 5 × $in · $cw = 1.25 × $in · $cr = 0.1 × $in.
        On the <strong>Claude Code plan</strong>, cache reads ($cr) are not billed — only API usage charges them.
      </p>
    </div>
  );
}

export function FormulasPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>

      {/* Section 1: Cost formulas */}
      <Card>
        <SectionHeader n={1}>Cost per call</SectionHeader>
        <FormulaBlock
          name="Theoretical API cost"
          latex={`cost = (in × $in + out × $out + cw × $cw + cr × $cr) / 1,000,000`}
          desc="What the Anthropic API would charge for this call — cache read included at reduced rate (10% of input price)."
          example={
            <>
              <span style={{ color: theme.color.text }}>Example · Sonnet 4.6 · in = 1,200 · out = 800 · cw = 5,000 · cr = 45,000</span>{'\n'}
              {'= (1,200×3 + 800×15 + 5,000×3.75 + 45,000×0.30) / 1e6'}{'\n'}
              {'= (3,600 + 12,000 + 18,750 + 13,500) / 1e6 = $0.04785'}
            </>
          }
        />
        <FormulaBlock
          name="Claude Code plan cost"
          latex={`costPlan = (in × $in + out × $out + cw × $cw) / 1,000,000`}
          desc="What the call represents on your Claude Code subscription. Cache reads are free on the plan — Anthropic does not bill cr via Claude Code, unlike the direct API."
          example={
            <>
              <span style={{ color: theme.color.text }}>Same example</span>{'\n'}
              {'= (3,600 + 12,000 + 18,750) / 1e6 = $0.03435'}{'\n'}
              {'Cache read savings: $0.04785 − $0.03435 = $0.01350'}
            </>
          }
        />
        <FormulaBlock
          name='"No cache" cost (reference)'
          latex={`costNoCache = ((in + cw + cr) × $in + out × $out) / 1,000,000`}
          desc="What the call would cost if prompt cache didn't exist — all inputs at full price. Used only to measure the savings achieved by caching."
          example={
            <>
              <span style={{ color: theme.color.text }}>Same example</span>{'\n'}
              {'= ((1,200 + 5,000 + 45,000) × 3 + 800 × 15) / 1e6'}{'\n'}
              {'= (51,200 × 3 + 12,000) / 1e6 = $0.1656'}{'\n'}
              {'Total cache savings: $0.1656 − $0.04785 = $0.1178 (≈ 71% savings)'}
            </>
          }
        />
      </Card>

      {/* Section 2: Pricing table */}
      <Card>
        <SectionHeader n={2}>Pricing per model (USD / 1M tokens)</SectionHeader>
        <PricingTable />
      </Card>

      {/* Section 3: Tokens & context */}
      <Card>
        <SectionHeader n={3}>Tokens &amp; context</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <FormulaBlock
              name="Total tokens of a call"
              latex={`total = in + out + cw + cr`}
              desc="Includes everything — input and output, cache read and cache written."
            />
            <FormulaBlock
              name="Context loaded per call"
              latex={`contextSize = in + cw + cr`}
              desc="Tokens sent to the model at this turn. This fills the context window. Output is not counted — it's generated, not sent — but it will be captured at the next turn via cr."
              example={
                <>
                  <span style={{ color: theme.color.text }}>in = 1,200 · cw = 5,000 · cr = 45,000</span>{'\n'}
                  {'contextSize = 51,200 tokens'}
                </>
              }
            />
          </div>
          <div>
            <FormulaBlock
              name="Max context of a session"
              latex={`maxContext = max(contextSize) over all calls`}
              desc="The peak fill observed across all turns in the session. Shown in the Context column."
            />
            <FormulaBlock
              name="% of model context window"
              latex={`ctxPct = contextSize / contextMax(model) × 100`}
              desc="Color code: < 40% optimal · 40–80% compact soon · > 80% critical. Anthropic recommends /compact from ~40%."
              example={
                <>
                  <span style={{ color: theme.color.text }}>contextSize = 51,200 · Sonnet 4.6 (max 200K)</span>{'\n'}
                  {'ctxPct = 51,200 / 200,000 = 25.6% → optimal'}
                </>
              }
            />
          </div>
        </div>
      </Card>

      {/* Section 4: Cache efficiency */}
      <Card>
        <SectionHeader n={4}>Cache efficiency</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <FormulaBlock
            name="Cache hit rate"
            latex={`cacheHit = cr / (cr + cw + in)`}
            desc="Proportion of context served from existing cache. The higher, the better the prompt cache works."
            example={
              <>
                <span style={{ color: theme.color.text }}>in = 1,200 · cw = 5,000 · cr = 45,000</span>{'\n'}
                {'cacheHit = 45,000 / 51,200 = 87.9%'}
              </>
            }
          />
          <FormulaBlock
            name="Cache savings achieved"
            latex={`savings = costNoCache − cost`}
            desc="Dollar amount saved compared to running without any prompt cache. A high hit rate on large contexts can save 60–90% of the theoretical API bill."
            example={
              <>
                <span style={{ color: theme.color.text }}>costNoCache = $0.1656 · cost = $0.04785</span>{'\n'}
                {'savings = $0.1178 ≈ 71% savings'}
              </>
            }
          />
        </div>
      </Card>

      {/* Section 5: Aggregate stats */}
      <Card>
        <SectionHeader n={5}>Aggregate stats (over the window)</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <FormulaBlock
              name="Total plan / API cost"
              latex={`totalPlan = Σ costPlan\ntotalApi  = Σ cost`}
              desc="Sum of per-call costs across all sessions in the selected window (today / 7 days / all time)."
            />
            <FormulaBlock
              name="Average cost per session"
              latex={`avgPerSession = totalPlan / nb_sessions`}
              desc="Useful for spotting unusually expensive sessions — compare against the Δ avg column."
            />
          </div>
          <div>
            <FormulaBlock
              name="Deviation vs average (Δ avg)"
              latex={`Δ = (sessionPlan − avgPerSession) / avgPerSession × 100`}
              desc="Color code: red ≥ +50% · amber ≥ +10% · green if negative."
            />
            <FormulaBlock
              name="Active session detection"
              latex={`fresh = (now − lastEventTs) < 90 seconds`}
              desc="A session is marked active if its last API event (JSONL timestamp) is less than 90 seconds old."
            />
          </div>
        </div>
      </Card>

      {/* Section 6: Data sources */}
      <Card>
        <SectionHeader n={6}>Data sources &amp; guarantees</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, fontSize: 13, color: theme.color.muted, lineHeight: 1.7 }}>
          <div>
            <p style={{ margin: '0 0 10px' }}>
              This monitor reads <strong style={{ color: theme.color.text }}>only</strong>{' '}
              <code style={{ fontFamily: theme.font.mono, fontSize: 12, color: theme.color.accent }}>{'~/.claude/projects/**/*.jsonl'}</code>{' '}
              files written by Claude Code. No Anthropic API calls are made, no telemetry is sent, and no data leaves your machine.
            </p>
            <p style={{ margin: 0 }}>
              Each JSONL record is one API turn. Records of type <code style={{ fontFamily: theme.font.mono, fontSize: 12 }}>assistant</code>{' '}
              and <code style={{ fontFamily: theme.font.mono, fontSize: 12 }}>progress</code> (sub-agents / hooks) carry usage stats.
              Duplicate <code style={{ fontFamily: theme.font.mono, fontSize: 12 }}>requestId</code> lines are de-duplicated so each API call counts once.
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 10px' }}>
              <strong style={{ color: theme.color.text }}>All dollar figures are estimates</strong> labeled "est" throughout the UI.
              Cache write (cw) and cache read (cr) pricing follows Anthropic's published rates at the time the monitor was last updated.
            </p>
            <p style={{ margin: 0 }}>
              The <strong style={{ color: theme.color.text }}>Claude Code plan</strong> does not charge for cache reads —
              the "plan cost" column omits cr to reflect your subscription bill.
              The "API cost" column includes cr at the reduced rate (10% of input price) for reference.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
