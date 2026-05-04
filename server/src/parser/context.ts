import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ContextFile, ContextOverhead } from '../types.js';
import type { ProjectEntry } from './projects.js';

export function estimateTokensFromBytes(bytes: number): number {
  // chars ≈ bytes for English/code; tokens ≈ chars / 4 (documented heuristic).
  return Math.ceil(bytes / 4);
}

async function fileSizeOrNull(path: string): Promise<number | null> {
  try {
    const s = await stat(path);
    return s.isFile() ? s.size : null;
  } catch {
    return null;
  }
}

async function* walk(dir: string, depth = 0): AsyncGenerator<string> {
  if (depth > 3) return;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch { return; }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try { s = await stat(full); } catch { continue; }
    if (s.isDirectory()) {
      yield* walk(full, depth + 1);
    } else if (s.isFile()) {
      yield full;
    }
  }
}

async function memoryFiles(project: ProjectEntry): Promise<ContextFile[]> {
  const memDir = join(homedir(), '.claude', 'projects', project.encoded, 'memory');
  const files: ContextFile[] = [];
  for await (const path of walk(memDir)) {
    if (!path.endsWith('.md')) continue;
    const size = await fileSizeOrNull(path);
    if (size === null) continue;
    const rel = path.slice(memDir.length + 1);
    files.push({
      path: `memory/${rel}`,
      role: rel === 'MEMORY.md' ? 'MEMORY.md' : 'memory-file',
      bytes: size,
      estTokens: estimateTokensFromBytes(size),
    });
  }
  return files;
}

async function projectClaudeMd(project: ProjectEntry): Promise<ContextFile | null> {
  const path = join(project.cwd, 'CLAUDE.md');
  const size = await fileSizeOrNull(path);
  if (size === null) return null;
  return { path: 'CLAUDE.md', role: 'CLAUDE.md', bytes: size, estTokens: estimateTokensFromBytes(size) };
}

async function userSkills(): Promise<ContextFile[]> {
  const skillsRoot = join(homedir(), '.claude', 'skills');
  const out: ContextFile[] = [];
  for await (const path of walk(skillsRoot)) {
    if (!path.endsWith('SKILL.md')) continue;
    const size = await fileSizeOrNull(path);
    if (size === null) continue;
    const rel = path.slice(skillsRoot.length + 1);
    out.push({ path: `~/.claude/skills/${rel}`, role: 'skill', bytes: size, estTokens: estimateTokensFromBytes(size) });
  }
  return out;
}

export async function contextOverheadFor(project: ProjectEntry): Promise<ContextOverhead> {
  const files: ContextFile[] = [];
  const claudeMd = await projectClaudeMd(project);
  if (claudeMd) files.push(claudeMd);
  files.push(...(await memoryFiles(project)));
  files.push(...(await userSkills()));
  const totalEstTokens = files.reduce((s, f) => s + f.estTokens, 0);
  return { project: project.displayName, cwd: project.cwd, files, totalEstTokens };
}
