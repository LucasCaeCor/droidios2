import { useEffect, useState } from 'react';
import { Bot, Boxes, FolderOpen, GitBranch, Hammer, Loader2, Play, Save, Settings, Sparkles } from 'lucide-react';
import { useStudio } from './store';
import FileTree from './components/FileTree';
import EditorPane from './components/EditorPane';
import TerminalPanel from './components/TerminalPanel';
import AgentPanel from './components/AgentPanel';
import Welcome from './components/Welcome';
import ConversionPanel from './components/ConversionPanel';
import SettingsModal from './components/SettingsModal';
import GitHubPanel from './components/GitHubPanel';

export default function App() {
  const s = useStudio();
  const [showConversion, setShowConversion] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGithub, setShowGithub] = useState(false);

  async function refreshTree() {
    if (!useStudio.getState().root) return;
    s.setFiles(await window.studio.workspace.tree('.', 5));
  }

  async function openFolder() {
    const root = await window.studio.dialog.openFolder();
    if (!root) return;
    s.setRoot(root);
    await refreshTree();
  }

  async function analyze() {
    s.setBusy('Analisando projeto Android...');
    try {
      const result = await window.studio.analysis.run();
      s.setAnalysis(result);
      setShowConversion(true);
    } catch (e:any) { alert(e.message); }
    finally { s.setBusy(null); }
  }

  async function save() {
    if (!s.openPath) return;
    await window.studio.workspace.writeFile(s.openPath, s.content);
    s.markSaved();
    await refreshTree();
  }

  useEffect(() => {
    window.studio.workspace.getRoot().then(async root => {
      if (root) { s.setRoot(root); await refreshTree(); }
    });
  }, []);

  const dirty = s.content !== s.savedContent;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Boxes size={18}/></div><b>Droid2iOS Studio</b><span className="badge">Agent IDE</span></div>
      <div className="project-pill" title={s.root || ''}>{s.root ? s.root.split(/[\\/]/).pop() : 'Nenhum projeto aberto'}</div>
      <div className="toolbar-actions">
        <button className="ghost" onClick={openFolder}><FolderOpen size={16}/>Abrir</button>
        <button className="ghost" disabled={!s.root} onClick={analyze}><Sparkles size={16}/>Analisar</button>
        <button className="ghost" disabled={!s.root} onClick={()=>setShowConversion(true)}><Hammer size={16}/>Conversão</button>
        <button className="ghost" disabled={!s.root} onClick={()=>setShowGithub(true)}><GitBranch size={16}/>GitHub</button>
        <button className={dirty?'primary':'ghost'} disabled={!s.openPath || !dirty} onClick={save}><Save size={16}/>Salvar</button>
        <button className="icon-btn" onClick={()=>setShowSettings(true)} title="Configurações"><Settings size={17}/></button>
      </div>
    </header>

    {!s.root ? <Welcome/> : <main className="workspace-grid">
      <aside className="left-pane panel"><FileTree onRefresh={refreshTree}/></aside>
      <section className="center-pane">
        <div className="editor-wrap panel"><EditorPane/></div>
        <div className="terminal-wrap panel"><TerminalPanel/></div>
      </section>
      <aside className="right-pane panel"><AgentPanel onFilesChanged={refreshTree}/></aside>
    </main>}

    {s.busy && <div className="busy-overlay"><div className="busy-card"><Loader2 className="spin"/><span>{s.busy}</span></div></div>}
    {showConversion && <ConversionPanel onClose={()=>setShowConversion(false)} onFilesChanged={refreshTree}/>} 
    {showSettings && <SettingsModal onClose={()=>setShowSettings(false)}/>} 
    {showGithub && <GitHubPanel onClose={()=>setShowGithub(false)}/>} 
  </div>;
}
