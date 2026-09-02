import { ChevronDown, ChevronRight, File, Folder, FolderOpen, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { FileNode } from '../types';
import { useStudio } from '../store';

function Node({node,depth}:{node:FileNode;depth:number}){
  const s=useStudio();
  const [open,setOpen]=useState(depth<1);
  async function select(){
    if(node.kind==='directory'){setOpen(!open);return;}
    try{s.setOpen(node.path,await window.studio.workspace.readFile(node.path));}catch(e:any){alert(e.message)}
  }
  return <>
    <button className={`tree-node ${s.openPath===node.path?'active':''}`} style={{paddingLeft:8+depth*14}} onClick={select}>
      {node.kind==='directory'?(open?<ChevronDown size={13}/>:<ChevronRight size={13}/>):<span className="tree-spacer"/>}
      {node.kind==='directory'?(open?<FolderOpen size={15}/>:<Folder size={15}/>):<File size={14}/>}
      <span>{node.name}</span>
    </button>
    {node.kind==='directory'&&open&&node.children?.map(ch=><Node key={ch.path} node={ch} depth={depth+1}/>) }
  </>
}
export default function FileTree({onRefresh}:{onRefresh:()=>void}){
  const s=useStudio();
  return <div className="pane-content"><div className="pane-title"><span>EXPLORADOR</span><button className="icon-btn tiny" onClick={onRefresh}><RefreshCw size={13}/></button></div><div className="tree-scroll">{s.files.map(n=><Node key={n.path} node={n} depth={0}/>)}</div></div>
}
