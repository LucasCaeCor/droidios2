import Editor from '@monaco-editor/react';
import { FileCode2, X } from 'lucide-react';
import { useStudio } from '../store';

function language(path:string|null){
  if(!path)return 'plaintext'; const ext=path.split('.').pop()?.toLowerCase();
  return ({kt:'kotlin',kts:'kotlin',java:'java',swift:'swift',xml:'xml',json:'json',ts:'typescript',tsx:'typescript',js:'javascript',jsx:'javascript',yml:'yaml',yaml:'yaml',md:'markdown',gradle:'groovy',properties:'ini'} as any)[ext||'']||'plaintext';
}
export default function EditorPane(){
  const s=useStudio();
  if(!s.openPath)return <div className="empty-editor"><FileCode2 size={42}/><b>Nenhum arquivo aberto</b><span>Selecione um arquivo no explorador ou peça ao agente para iniciar a migração.</span></div>;
  const dirty=s.content!==s.savedContent;
  return <div className="editor-pane"><div className="tabbar"><div className="editor-tab active"><FileCode2 size={14}/><span>{s.openPath.split('/').pop()}</span>{dirty&&<i/>}<button onClick={()=>s.setOpen(null)}><X size={13}/></button></div><div className="path-crumb">{s.openPath}</div></div><div className="monaco-host"><Editor theme="vs-dark" language={language(s.openPath)} value={s.content} onChange={v=>s.setContent(v||'')} options={{fontSize:13,fontFamily:'JetBrains Mono, Consolas, monospace',minimap:{enabled:true},wordWrap:'off',automaticLayout:true,smoothScrolling:true,renderWhitespace:'selection',padding:{top:12},scrollBeyondLastLine:false}}/></div></div>
}
