import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('studio', {
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder')
  },
  workspace: {
    setRoot: (root: string) => ipcRenderer.invoke('workspace:setRoot', root),
    getRoot: () => ipcRenderer.invoke('workspace:getRoot'),
    tree: (rel?: string, depth?: number) => ipcRenderer.invoke('workspace:tree', rel, depth),
    readFile: (p: string) => ipcRenderer.invoke('workspace:readFile', p),
    writeFile: (p: string, content: string) => ipcRenderer.invoke('workspace:writeFile', p, content),
    deleteFile: (p: string) => ipcRenderer.invoke('workspace:deleteFile', p),
    searchText: (q: string) => ipcRenderer.invoke('workspace:searchText', q),
    clone: (url: string, dest?: string) => ipcRenderer.invoke('workspace:clone', url, dest),
    gitStatus: () => ipcRenderer.invoke('workspace:gitStatus'),
    gitCommitAll: (msg: string) => ipcRenderer.invoke('workspace:gitCommitAll', msg),
    runCommand: (command: string, cwd?: string) => ipcRenderer.invoke('workspace:runCommand', command, cwd)
  },
  analysis: { run: () => ipcRenderer.invoke('analysis:run') },
  conversion: { scaffold: () => ipcRenderer.invoke('conversion:scaffold') },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (s: any) => ipcRenderer.invoke('settings:save', s)
  },
  agent: {
    test: () => ipcRenderer.invoke('agent:test'),
    ask: (params: any) => ipcRenderer.invoke('agent:ask', params),
    applyAction: (action: any) => ipcRenderer.invoke('agent:applyAction', action)
  },
  terminal: {
    create: (id: string, cwd?: string) => ipcRenderer.invoke('terminal:create', id, cwd),
    write: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),
    close: (id: string) => ipcRenderer.send('terminal:close', id),
    onData: (callback: (chunk: any) => void) => {
      const handler = (_e: any, chunk: any) => callback(chunk);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    }
  },
  github: {
    createRepo: (name: string, isPrivate: boolean, description?: string) => ipcRenderer.invoke('github:createRepo', name, isPrivate, description),
    push: (repoUrl: string, branch?: string) => ipcRenderer.invoke('github:push', repoUrl, branch),
    dispatch: (repoUrl: string, workflow?: string, ref?: string) => ipcRenderer.invoke('github:dispatch', repoUrl, workflow, ref),
    runs: (repoUrl: string, workflow?: string) => ipcRenderer.invoke('github:runs', repoUrl, workflow),
    logs: (repoUrl: string, runId: number) => ipcRenderer.invoke('github:logs', repoUrl, runId),
    downloadArtifact: (repoUrl: string, runId: number) => ipcRenderer.invoke('github:downloadArtifact', repoUrl, runId)
  },
  system: {
    openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
    reveal: (p: string) => ipcRenderer.invoke('system:reveal', p),
    exists: (p: string) => ipcRenderer.invoke('system:exists', p)
  }
});
