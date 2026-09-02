import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { analyzeProject } from './services/analyzer';
import { askAgent, testProvider } from './services/agent';
import { createConversionScaffold } from './services/conversion';
import * as github from './services/github';
import { loadSettings, saveSettings } from './services/settings';
import * as terminal from './services/terminal';
import * as workspace from './services/workspace';
import type { AgentAction, AppSettings } from './types';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#090d12',
    title: 'Droid2iOS Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { terminal.closeAllTerminals(); if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return null;
  workspace.setWorkspaceRoot(result.filePaths[0]);
  return result.filePaths[0];
});
ipcMain.handle('dialog:chooseFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('workspace:setRoot', (_e, root: string) => workspace.setWorkspaceRoot(root));
ipcMain.handle('workspace:getRoot', () => workspace.getWorkspaceRoot());
ipcMain.handle('workspace:tree', (_e, rel?: string, depth?: number) => workspace.tree(rel, depth));
ipcMain.handle('workspace:readFile', (_e, p: string) => workspace.readFile(p));
ipcMain.handle('workspace:writeFile', (_e, p: string, content: string) => workspace.writeFile(p, content));
ipcMain.handle('workspace:deleteFile', (_e, p: string) => workspace.deleteFile(p));
ipcMain.handle('workspace:searchText', (_e, q: string) => workspace.searchText(q));
ipcMain.handle('workspace:clone', (_e, url: string, dest?: string) => workspace.cloneRepo(url, dest));
ipcMain.handle('workspace:gitStatus', () => workspace.gitStatus());
ipcMain.handle('workspace:gitCommitAll', (_e, msg: string) => workspace.gitCommitAll(msg));
ipcMain.handle('workspace:runCommand', (_e, command: string, cwd?: string) => workspace.runCommand(command, cwd));

ipcMain.handle('analysis:run', () => analyzeProject());
ipcMain.handle('conversion:scaffold', () => createConversionScaffold());

ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:save', (_e, s: AppSettings) => saveSettings(s));
ipcMain.handle('agent:test', () => testProvider());
ipcMain.handle('agent:ask', (_e, params) => askAgent(params));
ipcMain.handle('agent:applyAction', async (_e, action: AgentAction) => {
  if (action.type === 'write_file') return workspace.writeFile(action.path, action.content);
  if (action.type === 'delete_file') return workspace.deleteFile(action.path);
  if (action.type === 'run_command') return workspace.runCommand(action.command, action.cwd || '.');
});

ipcMain.handle('terminal:create', (_e, id: string, cwd?: string) => terminal.createTerminal(id, cwd));
ipcMain.on('terminal:write', (_e, id: string, data: string) => terminal.writeTerminal(id, data));
ipcMain.on('terminal:close', (_e, id: string) => terminal.closeTerminal(id));

ipcMain.handle('github:createRepo', (_e, name: string, isPrivate: boolean, description?: string) => github.createRepository(name, isPrivate, description));
ipcMain.handle('github:push', (_e, repoUrl: string, branch?: string) => github.pushCurrentWorkspace(repoUrl, branch));
ipcMain.handle('github:dispatch', (_e, repoUrl: string, workflow?: string, ref?: string) => github.dispatchWorkflow(repoUrl, workflow, ref));
ipcMain.handle('github:runs', (_e, repoUrl: string, workflow?: string) => github.listRuns(repoUrl, workflow));
ipcMain.handle('github:logs', (_e, repoUrl: string, runId: number) => github.getRunLogs(repoUrl, runId));

ipcMain.handle('github:downloadArtifact', async (_e, repoUrl: string, runId: number) => {
  const dest = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (dest.canceled || !dest.filePaths[0]) return null;
  return github.downloadLatestArtifact(repoUrl, runId, dest.filePaths[0]);
});

ipcMain.handle('system:openExternal', (_e, url: string) => shell.openExternal(url));
ipcMain.handle('system:reveal', (_e, p: string) => shell.showItemInFolder(p));
ipcMain.handle('system:exists', (_e, p: string) => fs.existsSync(p));
