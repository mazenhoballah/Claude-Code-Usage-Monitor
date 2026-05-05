import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export type RawUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type AssistantLine = {
  type: 'assistant';
  timestamp: string;
  sessionId: string;
  requestId?: string;
  cwd?: string;
  message: {
    model: string;
    usage: RawUsage;
  };
};

export type AiTitleLine = { type: 'ai-title'; aiTitle?: string; sessionId?: string };

export type UserLine = {
  type: 'user';
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

export type AnyLine = AssistantLine | AiTitleLine | UserLine | { type: string; [k: string]: unknown };

export function isAiTitleLine(line: AnyLine): line is AiTitleLine {
  return line.type === 'ai-title' && typeof (line as AiTitleLine).aiTitle === 'string';
}

export function isUserLine(line: AnyLine): line is UserLine {
  return line.type === 'user';
}

/** Extract a plain-text first user message, skipping caveats, command echoes, and stdout blocks. */
export function extractUserText(line: UserLine): string | null {
  const c = line.message?.content;
  let text = '';
  if (typeof c === 'string') text = c;
  else if (Array.isArray(c)) {
    text = c.map((b) => (b && b.type === 'text' ? b.text ?? '' : '')).join(' ').trim();
  }
  text = text.trim();
  if (!text) return null;
  // Skip framework-injected blocks that aren't real user prompts.
  if (text.startsWith('<local-command-caveat>')) return null;
  if (text.startsWith('<command-name>')) return null;
  if (text.startsWith('<local-command-stdout>')) return null;
  if (text.startsWith('<system-reminder>')) return null;
  if (text.startsWith('Caveat:')) return null;
  // Strip a leading <command-stdout> tag if present, otherwise return as-is.
  return text;
}

export async function* readJsonl(filePath: string): AsyncGenerator<AnyLine> {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line) as AnyLine;
    } catch {
      // skip malformed lines silently — older sessions may have partial writes
    }
  }
}

export function isAssistantLine(line: AnyLine): line is AssistantLine {
  return (
    line.type === 'assistant' &&
    typeof (line as AssistantLine).message === 'object' &&
    typeof (line as AssistantLine).message?.usage === 'object'
  );
}
