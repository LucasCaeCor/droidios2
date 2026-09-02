import { FolderGit2, FolderOpen, GitFork, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { useStudio } from '../store';

export default function Welcome() {
  const s = useStudio();
  const [url,setUrl] = useState('');
  const [dest,setDest] = useState('');
  const [busy,setBusy] = useState(false);

  async function open() {
    const root = await window.studio.dialog.openFolder();
    if (!root) return;
    s.setRoot(root); s.setFiles(await window.studio.workspace.tree('.',5));
  }
  async function chooseDest() { const d=await window.studio.dialog.chooseFolder(); if(d)setDest(d); }
  async function clone() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const r=await window.studio.workspace.clone(url.trim(),dest||undefined);
      s.setRoot(r.root); s.setFiles(await window.studio.workspace.tree('.',5));
    } catch(e:any){ alert(e.message); }
    finally{setBusy(false)}
  }
  return <div className="welcome">
    <div className="welcome-card">
      <div className="hero-icon"><WandSparkles size={32}/></div>
      <h1>Android → iOS, dentro de um IDE.</h1>
      <p>Clone um app Android para um workspace separado, analise incompatibilidades, converta com agente e use GitHub Actions/macOS para gerar o IPA sem assinatura.</p>
      <div className="clone-box">
        <label>Repositório Android</label>
        <div className="row"><GitFork size={18}/><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://github.com/usuario/app-android.git"/></div>
        <label>Pasta de workspaces <small>(opcional)</small></label>
        <div className="row"><FolderGit2 size={18}/><input value={dest} readOnly placeholder="Documentos/Droid2iOS-Workspaces"/><button className="small-btn" onClick={chooseDest}>Escolher</button></div>
        <button className="primary wide" disabled={!url.trim()||busy} onClick={clone}>{busy?'Clonando...':'Clonar e abrir workspace'}</button>
      </div>
      <div className="or"><span/>ou<span/></div>
      <button className="ghost wide" onClick={open}><FolderOpen size={17}/>Abrir projeto local</button>
      <div className="welcome-note">O repositório de origem não é alterado. Toda conversão ocorre no clone aberto no Studio.</div>
    </div>
  </div>
}
