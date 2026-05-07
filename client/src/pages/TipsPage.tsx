import type { CSSProperties, ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Cpu,
  GitBranch,
  Settings,
  FileText,
  DollarSign,
  Zap,
  FileCode,
  Layers,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { theme } from '../theme';

function SectionTitle({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
      }}>
      <span
        style={{
          color: theme.color.accent,
          display: 'flex',
          alignSelf: 'center',
        }}>
        {icon}
      </span>
      <span style={{ fontWeight: 600, fontSize: 14, color: theme.color.text }}>
        {children}
      </span>
    </div>
  );
}

function CmdRow({
  cmd,
  desc,
  color,
}: {
  cmd: string;
  desc: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        padding: '5px 0',
        borderTop: `1px solid ${theme.color.border}`,
      }}>
      <code
        style={{
          fontSize: 12,
          fontFamily: theme.font.mono,
          color: color ?? theme.color.accent,
          background: 'var(--color-surface-hi)',
          padding: '2px 7px',
          borderRadius: 5,
          flexShrink: 0,
          letterSpacing: 0.2,
        }}>
        {cmd}
      </code>
      <span style={{ fontSize: 13, color: theme.color.muted }}>{desc}</span>
    </div>
  );
}

function InfoBox({
  children,
  tone = 'accent',
}: {
  children: ReactNode;
  tone?: 'accent' | 'warning' | 'positive';
}) {
  const borderColor =
    tone === 'warning'
      ? theme.color.warning
      : tone === 'positive'
        ? theme.color.positive
        : theme.color.accent;
  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 14px',
        borderLeft: `3px solid ${borderColor}`,
        background: 'var(--color-surface-hi)',
        borderRadius: `0 ${theme.radius.sm}px ${theme.radius.sm}px 0`,
        fontSize: 12,
        color: theme.color.muted,
        lineHeight: 1.6,
      }}>
      {children}
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '5px 0',
        fontSize: 13,
        color: theme.color.muted,
        lineHeight: 1.5,
      }}>
      <span style={{ color: theme.color.accent, flexShrink: 0, marginTop: 1 }}>
        •
      </span>
      <span>{children}</span>
    </div>
  );
}

function Highlight({ children }: { children: ReactNode }) {
  return <strong style={{ color: theme.color.text }}>{children}</strong>;
}

function AccentText({ children }: { children: ReactNode }) {
  return (
    <span style={{ color: theme.color.accent, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function cardStyle(extra?: CSSProperties): CSSProperties {
  return { height: '100%', ...extra };
}

export function TipsPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        paddingBottom: 8,
      }}>
      {/* Row 1: 4 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}>
        {/* Optimize context */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<Layers size={16} />}>
            Optimize context
          </SectionTitle>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              color: theme.color.muted,
              lineHeight: 1.6,
            }}>
            Anthropic recommends keeping context below{' '}
            <Highlight>~40%</Highlight> of the model's limit. Beyond that, every
            call replays everything:{' '}
            <Highlight>slower and more expensive</Highlight>.
          </p>
          <InfoBox tone='warning'>
            At <AccentText>40%</AccentText> threshold →{' '}
            <AccentText>/compact</AccentText> (summarizes the conversation,
            keeps key context).
            <br />
            Above <AccentText>80%</AccentText> or between independent tasks →{' '}
            <AccentText>/clear</AccentText> (starts fresh, keeps CLAUDE.md).
          </InfoBox>
        </Card>

        {/* Memory & project */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<BookOpen size={16} />}>
            Memory &amp; project
          </SectionTitle>
          <CmdRow
            cmd='/memory'
            desc='Display / edit persistent memory (user info, durable feedback, references).'
          />
          <CmdRow
            cmd='/init'
            desc='Initialize CLAUDE.md with auto-generated docs of the current codebase — read at every session.'
          />
          <CmdRow
            cmd='/review'
            desc='Review a PR (URL or PR number) with full codebase context.'
          />
        </Card>

        {/* Models & modes */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<Cpu size={16} />}>
            Models &amp; modes
          </SectionTitle>
          <CmdRow
            cmd='/model'
            desc='Switch Opus (reasoning) ↔ Sonnet (balanced) ↔ Haiku (economical).'
          />
          <CmdRow
            cmd='/fast'
            desc='Fast mode — Opus 4.6 streamed faster. No model downgrade.'
          />
          <CmdRow cmd='/config' desc='Theme, default model, global options.' />
          <InfoBox tone='accent'>
            <strong>Context limits:</strong>
            <br />
            Opus 4.7 [1M] · Sonnet 4.6 = <AccentText>1M tokens</AccentText>
            <br />
            Opus 4.6/4.5 · Haiku 4.5 = <AccentText>200K tokens</AccentText>
          </InfoBox>
        </Card>

        {/* Code workflows */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<GitBranch size={16} />}>
            Code workflows
          </SectionTitle>
          <CmdRow cmd='/review' desc='Review a PR (URL or PR number).' />
          <CmdRow
            cmd='/security-review'
            desc='Security audit of pending changes.'
            color='#f59e0b'
          />
          <CmdRow
            cmd='/ultrareview'
            desc='Multi-agent cloud review (billed, explicit request).'
            color='#8b5cf6'
          />
          <CmdRow
            cmd='/loop <n>'
            desc='Loop a prompt at interval (/loop 5m /foo). Without interval = auto-paced.'
          />
          <CmdRow cmd='/schedule' desc='Scheduled agent (cron or one-shot).' />
        </Card>
      </div>

      {/* Row 2: 4 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}>
        {/* Config & extensions */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<Settings size={16} />}>
            Config &amp; extensions
          </SectionTitle>
          <CmdRow
            cmd='/permissions'
            desc='Allow/deny tools (Bash, MCP, etc.).'
          />
          <CmdRow cmd='/mcp' desc='Connected MCP servers.' />
          <CmdRow cmd='/ide' desc='IDE extension (VS Code, JetBrains).' />
          <CmdRow
            cmd='/hooks'
            desc='Active hooks (PreToolUse, PostToolUse, etc.).'
          />
        </Card>

        {/* Document skills */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<FileText size={16} />}>
            Document skills
          </SectionTitle>
          <CmdRow
            cmd='xlsx'
            desc='Excel: .xlsx, .csv — read, edit, formulas, charts.'
          />
          <CmdRow
            cmd='docx'
            desc='Word: TOC, headers, images, tracked changes.'
          />
          <CmdRow
            cmd='pptx'
            desc='PowerPoint: slides, layouts, speaker notes.'
          />
          <CmdRow cmd='pdf' desc='PDFs: merge, split, OCR, table extraction.' />
        </Card>

        {/* Cost best practices */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<DollarSign size={16} />}>
            Cost best practices
          </SectionTitle>
          <Bullet>
            The <Highlight>cache read</Highlight> is not billed on the plan —
            favor long coherent conversations rather than restarting short
            sessions.
          </Bullet>
          <Bullet>
            For mass search/reading, delegate to an{' '}
            <AccentText>Explore</AccentText> sub-agent: it consumes its own
            context, the parent stays light.
          </Bullet>
          <Bullet>
            For parallelizable tasks, launch multiple{' '}
            <Highlight>sub-agents in parallel</Highlight> (1 message, several
            Agent blocks) instead of sequentially.
          </Bullet>
          <Bullet>
            Prefer <Highlight>Sonnet 4.6</Highlight> (5× cheaper than Opus) or{' '}
            <Highlight>Haiku 4.5</Highlight> (25× cheaper) for reading /
            formatting / lightweight tools.
          </Bullet>
          <InfoBox tone='positive'>
            Pricing: output ≈ 5× input · cache write = 1.25× input · cache read
            = 0.1× input (free on Claude Code plan).
          </InfoBox>
        </Card>

        {/* Auto-compact & session hygiene */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<Zap size={16} />}>Session hygiene</SectionTitle>
          <Bullet>
            Enable <AccentText>autoCompactEnabled</AccentText> in{' '}
            <code style={{ fontSize: 12, fontFamily: theme.font.mono }}>
              ~/.claude/settings.json
            </code>{' '}
            to auto-compact when context nears the limit.
          </Bullet>
          <Bullet>
            Start each project with a focused CLAUDE.md — keep it{' '}
            <Highlight>under 500 tokens</Highlight>. Trim regularly; bloated
            instructions are loaded every turn.
          </Bullet>
          <Bullet>
            Use <AccentText>/compact</AccentText> between distinct tasks in the
            same session rather than starting a new session — the cache stays
            warm, cost stays low.
          </Bullet>
          <Bullet>
            Set your default model to <Highlight>Sonnet</Highlight> and only
            switch to Opus for tasks that genuinely need deeper reasoning.
          </Bullet>
        </Card>
      </div>

      {/* Row 3: 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* CLAUDE.md best practices */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<FileCode size={16} />}>
            CLAUDE.md best practices
          </SectionTitle>
          <Bullet>
            <Highlight>Focus on the non-obvious</Highlight>: architecture
            decisions, hidden constraints, project-specific rules, and
            conventions not derivable from code.
          </Bullet>
          <Bullet>
            <Highlight>No tutorials</Highlight>: Claude already knows how
            frameworks work. Only document what's specific to your project.
          </Bullet>
          <Bullet>
            Use <AccentText>/init</AccentText> to auto-generate a baseline, then
            trim aggressively. Every token in CLAUDE.md is paid per turn.
          </Bullet>
          <Bullet>
            Place a CLAUDE.md in subdirectories for module-specific rules —
            Claude reads them when it enters that directory.
          </Bullet>
          <Bullet>
            Keep a <Highlight>Commands</Highlight> section with the exact
            commands to build, test, lint, and start the project.
          </Bullet>
        </Card>

        {/* Slash command cheatsheet */}
        <Card style={cardStyle()}>
          <SectionTitle icon={<AlertTriangle size={16} />}>
            Quick reference
          </SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 16px',
            }}>
            <div>
              <CmdRow cmd='/compact' desc='Summarize + keep context.' />
              <CmdRow cmd='/clear' desc='Fresh start, keep CLAUDE.md.' />
              <CmdRow cmd='/model' desc='Switch model.' />
              <CmdRow cmd='/fast' desc='Faster Opus 4.6 mode.' />
              <CmdRow cmd='/memory' desc='Edit persistent memory.' />
            </div>
            <div>
              <CmdRow cmd='/init' desc='Generate CLAUDE.md.' />
              <CmdRow cmd='/permissions' desc='Tool allow/deny rules.' />
              <CmdRow cmd='/hooks' desc='Manage automation hooks.' />
              <CmdRow cmd='/mcp' desc='MCP server list.' />
              <CmdRow cmd='/ide' desc='IDE extension settings.' />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
