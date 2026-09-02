import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import AdmZip from 'adm-zip';
import { loadSettings } from './settings';
import { getWorkspaceRoot } from './workspace';
import type { GitHubRun } from '../types';

function token() {
  const value = loadSettings().githubToken;
  if (!value) throw new Error('Configure um GitHub Personal Access Token nas configurações.');
  return value;
}

async function ghFetch(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token()}`, 'X-GitHub-Api-Version': '2026-03-10', ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

export async function createRepository(name: string, isPrivate = true, description = 'Converted by Droid2iOS Studio') {
  return ghFetch('https://api.github.com/user/repos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, private: isPrivate, description, auto_init: false }) });
}

function parseRepo(repoUrl: string) {
  const m = repoUrl.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/i);
  if (!m) throw new Error('URL GitHub inválida.');
  return { owner: m[1], repo: m[2] };
}

export async function pushCurrentWorkspace(repoUrl: string, branch = 'main') {
  const root = getWorkspaceRoot(); if (!root) throw new Error('Nenhum projeto aberto.');
  const auth = Buffer.from(`x-access-token:${token()}`).toString('base64');
  const runGit = (args: string[], extraEnv: NodeJS.ProcessEnv = {}) => new Promise<{code:number;stdout:string;stderr:string}>((resolve) => {
    const child = spawn('git', args, { cwd: root, windowsHide: true, env: { ...process.env, ...extraEnv } });
    let stdout=''; let stderr='';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }));
  });
  await runGit(['remote', 'remove', 'droid2ios']);
  const add = await runGit(['remote', 'add', 'droid2ios', repoUrl]);
  if (add.code !== 0) throw new Error(add.stderr || 'Falha ao configurar remote de destino.');
  const env = {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${auth}`
  };
  return runGit(['push', '-u', 'droid2ios', `HEAD:${branch}`], env);
}

export async function dispatchWorkflow(repoUrl: string, workflow = 'ios-unsigned.yml', ref = 'main') {
  const { owner, repo } = parseRepo(repoUrl);
  await ghFetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref }) });
  return true;
}

export async function listRuns(repoUrl: string, workflow = 'ios-unsigned.yml'): Promise<GitHubRun[]> {
  const { owner, repo } = parseRepo(repoUrl);
  const data: any = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=20`);
  return (data.workflow_runs || []).map((r: any) => ({ id: r.id, name: r.name, status: r.status, conclusion: r.conclusion, htmlUrl: r.html_url, createdAt: r.created_at, branch: r.head_branch }));
}

export async function downloadLatestArtifact(repoUrl: string, runId: number, destinationDir: string) {
  const { owner, repo } = parseRepo(repoUrl);
  const data: any = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`);
  const artifact = (data.artifacts || []).find((a: any) => !a.expired && a.name.includes('unsigned')) || data.artifacts?.[0];
  if (!artifact) throw new Error('Nenhum artifact disponível para esse run.');
  const res = await fetch(artifact.archive_download_url, { headers: { 'Authorization': `Bearer ${token()}`, 'Accept': 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Falha ao baixar artifact: ${res.status}`);
  fs.mkdirSync(destinationDir, { recursive: true });
  const filePath = path.join(destinationDir, `${artifact.name}.zip`);
  fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));
  return filePath;
}

export async function getRunLogs(repoUrl: string, runId: number) {
  const { owner, repo } = parseRepo(repoUrl);
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`, {
    headers: { 'Authorization': `Bearer ${token()}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Falha ao baixar logs: ${res.status}`);
  const zip = new AdmZip(Buffer.from(await res.arrayBuffer()));
  const chunks: string[] = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const text = entry.getData().toString('utf8');
    if (/error|fail|exception|unresolved|xcodebuild|gradle/i.test(text)) chunks.push(`### ${entry.entryName}\n${text}`);
    if (chunks.join('\n').length > 220000) break;
  }
  return (chunks.join('\n\n') || 'Nenhum trecho textual de erro encontrado nos logs.').slice(0, 220000);
}
