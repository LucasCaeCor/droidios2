import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { app } from 'electron';
import type { FileNode } from '../types';

const IGNORE = new Set(['.git', 'node_modules', '.gradle', 'build', 'dist', 'release', '.idea', '.kotlin']);
let currentRoot: string | null = null;

export function getWorkspaceRoot() { return currentRoot; }
export function setWorkspaceRoot(root: string) { currentRoot = path.resolve(root); return currentRoot; }

function assertRoot() {
  if (!currentRoot) throw new Error('Nenhum projeto aberto.');
  return currentRoot;
}

function resolveSafe(relativePath: string) {
  const root = assertRoot();
  const target = path.resolve(root, relativePath || '.');
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Caminho fora do workspace.');
  return target;
}

export function tree(relativePath = '.', depth = 4): FileNode[] {
  const target = resolveSafe(relativePath);
  function walk(dir: string, level: number): FileNode[] {
    if (level > depth) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => !IGNORE.has(d.name))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
      .slice(0, 400)
      .map(d => {
        const full = path.join(dir, d.name);
        const rel = path.relative(assertRoot(), full).replaceAll('\\', '/');
        return d.isDirectory()
          ? { name: d.name, path: rel, kind: 'directory' as const, children: level < depth ? walk(full, level + 1) : [] }
          : { name: d.name, path: rel, kind: 'file' as const };
      });
  }
  return walk(target, 0);
}

export function readFile(relativePath: string, maxBytes = 1_500_000) {
  const target = resolveSafe(relativePath);
  const stat = fs.statSync(target);
  if (stat.size > maxBytes) throw new Error(`Arquivo muito grande (${stat.size} bytes).`);
  return fs.readFileSync(target, 'utf8');
}

export function writeFile(relativePath: string, content: string) {
  const target = resolveSafe(relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
  return true;
}

export function deleteFile(relativePath: string) {
  const target = resolveSafe(relativePath);
  if (fs.statSync(target).isDirectory()) fs.rmSync(target, { recursive: true, force: true });
  else fs.unlinkSync(target);
  return true;
}

export function searchText(query: string, maxResults = 80) {
  const root = assertRoot();
  const results: Array<{ path: string; line: number; text: string }> = [];
  const exts = new Set(['.kt', '.kts', '.java', '.xml', '.gradle', '.properties', '.toml', '.json', '.yaml', '.yml', '.swift', '.m', '.mm', '.ts', '.tsx', '.js', '.jsx', '.md']);
  function visit(dir: string) {
    if (results.length >= maxResults) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (results.length >= maxResults) break;
      if (IGNORE.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (exts.has(path.extname(entry.name).toLowerCase())) {
        let text = '';
        try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length && results.length < maxResults; i++) {
          if (lines[i].toLowerCase().includes(query.toLowerCase())) {
            results.push({ path: path.relative(root, full).replaceAll('\\', '/'), line: i + 1, text: lines[i].trim().slice(0, 300) });
          }
        }
      }
    }
  }
  visit(root);
  return results;
}

function runProcess(command: string, args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('error', reject);
    child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export async function cloneRepo(url: string, destination?: string) {
  const base = destination || path.join(app.getPath('documents'), 'Droid2iOS-Workspaces');
  fs.mkdirSync(base, { recursive: true });
  const inferred = url.replace(/\/$/, '').split('/').pop()?.replace(/\.git$/, '') || 'android-project';
  let dest = path.join(base, inferred);
  if (fs.existsSync(dest)) dest = path.join(base, `${inferred}-${Date.now()}`);
  const result = await runProcess('git', ['clone', '--depth=1', url, dest], base);
  if (result.code !== 0) throw new Error(result.stderr || 'Falha ao clonar repositório.');
  setWorkspaceRoot(dest);
  return { root: dest, stdout: result.stdout };
}

export async function gitStatus() {
  const root = assertRoot();
  return runProcess('git', ['status', '--short', '--branch'], root);
}

export async function gitCommitAll(message: string) {
  const root = assertRoot();
  const add = await runProcess('git', ['add', '-A'], root);
  if (add.code !== 0) throw new Error(add.stderr);
  const commit = await runProcess('git', ['commit', '-m', message], root);
  return commit;
}

export async function runCommand(command: string, cwdRelative = '.') {
  const cwd = resolveSafe(cwdRelative);
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
    const args = process.platform === 'win32' ? ['-NoProfile', '-Command', command] : ['-lc', command];
    const child = spawn(shell, args, { cwd, windowsHide: true });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }));
  });
}
