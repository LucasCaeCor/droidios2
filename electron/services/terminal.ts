import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { BrowserWindow } from 'electron';
import path from 'node:path';
import { getWorkspaceRoot } from './workspace';

const sessions = new Map<string, ChildProcessWithoutNullStreams>();

export function createTerminal(sessionId: string, cwd?: string) {
  closeTerminal(sessionId);
  const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
  const root = getWorkspaceRoot() || process.cwd();
  const actualCwd = cwd ? path.resolve(root, cwd) : root;
  const child = spawn(shell, process.platform === 'win32' ? ['-NoLogo'] : ['-i'], {
    cwd: actualCwd,
    env: { ...process.env, TERM: 'xterm-256color' },
    windowsHide: true
  });
  sessions.set(sessionId, child);
  const send = (data: string) => BrowserWindow.getAllWindows()[0]?.webContents.send('terminal:data', { sessionId, data });
  child.stdout.on('data', d => send(d.toString()));
  child.stderr.on('data', d => send(d.toString()));
  child.on('close', code => { send(`\r\n[processo encerrado: ${code ?? -1}]\r\n`); sessions.delete(sessionId); });
  child.on('error', err => send(`\r\n[erro: ${err.message}]\r\n`));
  return true;
}

export function writeTerminal(sessionId: string, data: string) { sessions.get(sessionId)?.stdin.write(data); }
export function closeTerminal(sessionId: string) { const child = sessions.get(sessionId); if (child) { child.kill(); sessions.delete(sessionId); } }
export function closeAllTerminals() { for (const id of [...sessions.keys()]) closeTerminal(id); }
