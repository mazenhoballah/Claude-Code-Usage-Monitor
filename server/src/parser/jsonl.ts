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
  cwd?: string;
  message: {
    model: string;
    usage: RawUsage;
  };
};

export type AnyLine = AssistantLine | { type: string; [k: string]: unknown };

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
