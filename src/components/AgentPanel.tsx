import { Bot, Check, ChevronRight, CircleAlert, Play, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStudio } from '../store';
import type { AgentAction } from '../types';

function ActionCard({action,messageId,onApplied}:{action:AgentAction;messageId:string;onApplied:()=>void}){
  const s=useStudio(); const [busy,setBusy]=useState(false);
  async function apply(){setBusy(true);try{const r=await window.studio.agent.applyAction(action);s.updateAction(messageId,action.id);onApplied();if(action.type==='run_command'&&r?.stdout)s.addChat({id:crypto.randomUUID(),role:'system',content:`Comando concluído (${r.code})\n${r.stdout}${r.stderr||''}`})}catch(e:any){alert(e.message)}finally{setBusy(false)}}
  return <div className="action-card"><div className="action-icon">{action.type==='run_command'?<Play size={14}/>:action.type==='delete_file'?<Trash2 size={14}/>:<ChevronRight size={14}/>}</div><div className="action-body"><b>{action.type==='run_command'?'Executar comando':action.type==='delete_file'?'Excluir arquivo':'Gravar arquivo'}</b><code>{action.type==='run_command'?action.command:action.path}</code><small>{action.reason}</small><div className="action-buttons"><button className="approve" onClick={apply} disabled={busy}><Check size={13}/>{busy?'Aplicando...':'Aplicar'}</button><button className="reject" onClick={()=>s.updateAction(messageId,action.id)}><X size={13}/>Ignorar</button></div></div></div>
}

export default function AgentPanel({onFilesChanged}:{onFilesChanged:()=>void}){
  const s=useStudio(); const [input,setInput]=useState(''); const [busy,setBusy]=useState(false); const end=useRef<HTMLDivElement>(null);
  async function send(){
    const text=input.trim(); if(!text||busy)return; setInput('');
    const user={id:crypto.randomUUID(),role:'user' as const,content:text}; s.addChat(user);setBusy(true);
    try{
      const resp=await window.studio.agent.ask({message:text,analysis:s.analysis,openFile:s.openPath?{path:s.openPath,content:s.content}:null,history:s.chat.filter(x=>x.role!=='system').slice(-8).map(x=>({role:x.role,content:x.content}))});
      const settings=await window.studio.settings.get();
      if(settings.autoApplyAgentActions && resp.actions.length){
        const outputs:string[]=[];
        for(const action of resp.actions){
          const r=await window.studio.agent.applyAction(action);
          outputs.push(`${action.type}: ${action.type==='run_command' ? action.command : action.path}${r?.code!==undefined?` (exit ${r.code})`:''}`);
        }
        s.addChat({id:crypto.randomUUID(),role:'assistant',content:`${resp.message}\n\nAuto-apply executado:\n${outputs.join('\n')}`,diagnostics:resp.diagnostics});
        onFilesChanged();
      } else {
        s.addChat({id:crypto.randomUUID(),role:'assistant',content:resp.message,actions:resp.actions,diagnostics:resp.diagnostics});
      }
      setTimeout(()=>end.current?.scrollIntoView({behavior:'smooth'}),30);
    }catch(e:any){s.addChat({id:crypto.randomUUID(),role:'system',content:`Erro do agente: ${e.message}`})}finally{setBusy(false)}
  }
  return <div className="agent-panel"><div className="agent-head"><div><div className="agent-avatar"><Bot size={16}/></div><div><b>Agente de Migração</b><small>Android · KMP · iOS · Xcode</small></div></div><span className="status-dot">online</span></div><div className="chat-scroll">
    {s.chat.length===0&&<div className="agent-empty"><Sparkles size={26}/><b>Agente dentro do projeto</b><p>Ele pode ler arquivos, procurar APIs Android, propor alterações e executar builds. Mudanças destrutivas exigem sua aprovação por padrão.</p><div className="suggestions"><button onClick={()=>setInput('Analise este projeto e crie um plano detalhado de migração para iOS.')}>Criar plano de migração</button><button onClick={()=>setInput('Localize as dependências Android-only que precisam ser isoladas para Kotlin Multiplatform.')}>Encontrar bloqueadores iOS</button><button onClick={()=>setInput('Continue a conversão do projeto para iOS e proponha as próximas alterações seguras.')}>Continuar conversão</button></div></div>}
    {s.chat.map(m=><div key={m.id} className={`chat-msg ${m.role}`}><div className="msg-role">{m.role==='user'?'VOCÊ':m.role==='assistant'?'AGENTE':'SISTEMA'}</div><div className="msg-text">{m.content}</div>{m.diagnostics?.map((d,i)=><div className="diagnostic" key={i}><CircleAlert size={13}/>{d}</div>)}{m.actions?.map(a=><ActionCard key={a.id} action={a} messageId={m.id} onApplied={onFilesChanged}/>)}</div>)}
    {busy&&<div className="thinking"><span/><span/><span/> Analisando código...</div>}<div ref={end}/>
  </div><div className="chat-input"><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Peça uma correção, migração ou análise..." onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/><button className="send-btn" onClick={send} disabled={!input.trim()||busy}><Send size={16}/></button><div className="chat-hint">Enter envia · Shift+Enter quebra linha · ações são revisáveis</div></div></div>
}
