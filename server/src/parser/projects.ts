import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

export type ProjectEntry = {
  encoded: string;        // raw folder name e.g. "-Users-foo-app"
  cwd: string;            // decoded absolute path "/Users/foo/app"
  displayName: string;    // last segment "app"
  dir: string;            // absolute path to the project's session dir
};

export function decodeProjectFolder(encoded: string): string {
  // Claude Code encodes paths by replacing "/" with "-" and prefixing a leading "-".
  // Best-effort: strip the leading "-" and replace remaining "-" with "/".
  const trimmed = encoded.startsWith('-') ? encoded.slice(1) : encoded;
  return '/' + trimmed.replace(/-/g, '/');
}

export async function listProjects(): Promise<ProjectEntry[]> {
  let entries: string[];
  try {
    entries = await readdir(PROJECTS_DIR);
  } catch {
    return [];
  }
  const result: ProjectEntry[] = [];
  for (const name of entries) {
    const dir = join(PROJECTS_DIR, name);
    try {
      const s = await stat(dir);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    const cwd = decodeProjectFolder(name);
    result.push({
      encoded: name,
      cwd,
      displayName: cwd.split('/').filter(Boolean).pop() ?? name,
      dir,
    });
  }
  return result;
}

export async function listSessionFiles(projectDir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    return [];
  }
  return entries.filter((f) => f.endsWith('.jsonl')).map((f) => join(projectDir, f));
}
