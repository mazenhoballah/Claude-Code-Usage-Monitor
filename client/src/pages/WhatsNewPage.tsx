import type { ReactNode } from 'react';
import { Cpu, Terminal, Plug, Zap, GitBranch, BookOpen, DollarSign, Layers } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { theme } from '../theme';

type Category = 'models' | 'claude-code' | 'api' | 'context' | 'cost';

const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  'models':      { label: 'Models',      color: '#7c3aed' },
  'claude-code': { label: 'Claude Code', color: theme.color.accent },
  'api':         { label: 'API',         color: '#0ea5e9' },
  'context':     { label: 'Context',     color: '#f59e0b' },
  'cost':        { label: 'Cost',        color: theme.color.positive },
};

type Entry = {
  date: string;
  title: string;
  category: Category;
  icon: ReactNode;
  items: (string | ReactNode)[];
};

const ENTRIES: Entry[] = [
  {
    date: 'May 2025',
    title: 'Claude 4 Model Family',
    category: 'models',
    icon: <Cpu size={15} />,
    items: [
      'Claude Opus 4.7 — most capable model with a 1 M-token context variant (Opus 4.7 [1M]). Priced at $30/$150 per MTok in/out.',
      'Claude Sonnet 4.6 — new default model. 5× cheaper than Opus ($3/$15 per MTok) while matching Opus 4.6 on most coding tasks.',
      'Claude Haiku 4.5 — most economical ($1/$5 per MTok), ideal for high-volume reading, formatting, and lightweight tooling.',
      'All Claude 4 models support 200 K context; Opus 4.7 [1M] extends to 1 M tokens for very long codebases or documents.',
    ],
  },
  {
    date: 'May 2025',
    title: 'Fast Mode',
    category: 'claude-code',
    icon: <Zap size={15} />,
    items: [
      '/fast enables faster output on Opus 4.6 — streamed tokens arrive quicker without switching to a smaller model.',
      'Toggle in the same session with /fast again. Useful when you need quick iteration on short tasks.',
    ],
  },
  {
    date: 'Apr 2025',
    title: 'Hooks System',
    category: 'claude-code',
    icon: <Terminal size={15} />,
    items: [
      'Shell commands that fire automatically at lifecycle events: PreToolUse, PostToolUse, PreCompact, PostCompact, Stop, SessionStart, UserPromptSubmit.',
      'Hooks can block tool calls, inject context back into the model, auto-format written files, log bash commands, or gate dangerous actions.',
      'Configure per-project in .claude/settings.json or globally in ~/.claude/settings.json.',
      'Hook output is JSON — return { continue: false, stopReason: "…" } to block, { hookSpecificOutput: { additionalContext } } to inject context.',
    ],
  },
  {
    date: 'Apr 2025',
    title: 'Skills & Plugins',
    category: 'claude-code',
    icon: <BookOpen size={15} />,
    items: [
      'Skills are markdown files that extend Claude\'s behavior — invoked with /skill-name or the Skill tool.',
      'Claude Code Marketplace distributes community and first-party plugins (e.g., superpowers bundle: brainstorming, TDD, debugging, writing-plans).',
      'Plugins are installed per-project or globally and listed in settings under enabledPlugins.',
      'Skills override default behavior when invoked; user instructions (CLAUDE.md) always take precedence over skill instructions.',
    ],
  },
  {
    date: 'Mar 2025',
    title: 'MCP Server Integration',
    category: 'claude-code',
    icon: <Plug size={15} />,
    items: [
      'Model Context Protocol (MCP) lets Claude connect to external tools and data sources as structured servers.',
      'First-party MCP servers include: Playwright (browser automation), Figma, Gmail, Google Calendar, code-review-graph.',
      '/mcp lists connected servers; configure in settings.json under mcpServers.',
      'MCP tools appear alongside built-in tools — Claude can call them with the same tool-use mechanism.',
      'enableAllProjectMcpServers / enabledMcpjsonServers / disabledMcpjsonServers control which servers are active.',
    ],
  },
  {
    date: 'Mar 2025',
    title: 'Sub-agents & Parallel Work',
    category: 'claude-code',
    icon: <GitBranch size={15} />,
    items: [
      'The Agent tool lets Claude spawn specialized sub-agents (Explore, Plan, general-purpose, component-test-fixer, code-reviewer, …).',
      'Multiple Agent tool calls in a single message run concurrently — ideal for independent research or parallel file edits.',
      'Worktree isolation mode (isolation: "worktree") gives each agent its own git worktree so changes don\'t collide.',
      '/ultrareview launches a multi-agent cloud review of the current branch or a GitHub PR — billed separately, user-triggered only.',
      'Background agents (run_in_background: true) free the main context while long tasks complete.',
    ],
  },
  {
    date: 'Feb 2025',
    title: 'Prompt Caching & Cost Impact',
    category: 'cost',
    icon: <DollarSign size={15} />,
    items: [
      'Cache write (cw) — first time a prompt prefix is stored, billed at 1.25× input rate.',
      'Cache read (cr) — subsequent hits load from cache at 0.1× input rate (10× cheaper than full input).',
      'Claude Code plan: cache reads are not billed — only API usage charges cr. Subscription users pay only cw + in + out.',
      'Typical Claude Code session: 80–96% cache hit rate, saving 60–90% of the theoretical API cost per call.',
      'Cache TTL is 5 minutes — sleeping past 300 s in a /loop or between turns breaks the cache and triggers a cold reload.',
    ],
  },
  {
    date: 'Feb 2025',
    title: 'Extended Thinking',
    category: 'api',
    icon: <Layers size={15} />,
    items: [
      'Claude can emit "thinking" tokens before its final response — a scratchpad for multi-step reasoning invisible to end users.',
      'Extended thinking is enabled at the API level; Claude Code surfaces it as deeper reasoning on complex tasks.',
      'Thinking tokens are billed as output tokens but give significantly better results on math, planning, and multi-step code tasks.',
      'alwaysThinkingEnabled in settings.json forces thinking on every turn.',
    ],
  },
  {
    date: 'Jan 2025',
    title: 'Auto-Compact & Context Management',
    category: 'context',
    icon: <Layers size={15} />,
    items: [
      'autoCompactEnabled in ~/.claude/settings.json triggers automatic /compact when context approaches the model\'s limit.',
      '/compact summarizes the conversation while preserving key context — cache stays warm, cost stays low.',
      '/clear starts fresh, keeping CLAUDE.md loaded — useful between unrelated tasks.',
      'Context % threshold guidance: < 40% optimal · 40–80% compact soon · > 80% critical — /compact from ~40%.',
      'PreCompact hook fires before any compact (manual or auto), allowing you to inject notes on what to preserve.',
    ],
  },
  {
    date: 'Jan 2025',
    title: 'Scheduled Agents & /loop',
    category: 'claude-code',
    icon: <Terminal size={15} />,
    items: [
      '/loop <interval> <prompt> repeats a prompt on a fixed schedule (e.g., /loop 5m /check-build).',
      '/loop without an interval enters auto-paced mode — Claude chooses the next wake-up based on what it\'s waiting for.',
      '/schedule creates one-shot or cron-based agents that persist across sessions.',
      'ScheduleWakeup tool used internally by /loop: sleeps under 300 s stay in the prompt cache; longer sleeps pay a cache miss.',
    ],
  },
  {
    date: 'Dec 2024',
    title: 'IDE Extensions & Status Line',
    category: 'claude-code',
    icon: <Terminal size={15} />,
    items: [
      'VS Code and JetBrains extensions bring Claude Code inline — /ide connects the extension to the current session.',
      'Status line in the terminal shows model, token count, and cost as you work.',
      'Keyboard shortcuts: Escape cancels the current tool call; Ctrl+O shows the compact summary.',
      'Inline diff review lets you accept, reject, or amend individual hunks before Claude finalises a write.',
    ],
  },
];

function CategoryBadge({ category }: { category: Category }) {
  const { label, color } = CATEGORY_META[category];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
      textTransform: 'uppercase', color, border: `1px solid ${color}`,
      borderRadius: 4, padding: '2px 7px', flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ color: CATEGORY_META[entry.category].color }}>{entry.icon}</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: theme.color.text, flex: 1 }}>{entry.title}</span>
        <CategoryBadge category={entry.category} />
        <span style={{ fontSize: 11, color: theme.color.muted, flexShrink: 0 }}>{entry.date}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entry.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: theme.color.muted, lineHeight: 1.55 }}>
            <span style={{ color: CATEGORY_META[entry.category].color, flexShrink: 0, marginTop: 2 }}>•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function WhatsNewPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: theme.color.text }}>Recent Claude &amp; Claude Code updates</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(CATEGORY_META) as Category[]).map((cat) => (
            <CategoryBadge key={cat} category={cat} />
          ))}
        </div>
      </div>
      {ENTRIES.map((entry, i) => (
        <EntryCard key={i} entry={entry} />
      ))}
    </div>
  );
}
