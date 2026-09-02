import { CheckCircle2, CircleAlert, Hammer, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useStudio } from '../store';
import { useState } from 'react';

export default function ConversionPanel({onClose,onFilesChanged}:{onClose:()=>void;onFilesChanged:()=>void}){
  const s=useStudio(); const [busy,setBusy]=useState(false); const [created,setCreated]=useState<string[]|null>(null);
  async function analyze(){setBusy(true);try{s.setAnalysis(await window.studio.analysis.run())}catch(e:any){alert(e.message)}finally{setBusy(false)}}
  async function scaffold(){setBusy(true);try{const r=await window.studio.conversion.scaffold();setCreated(r.created);s.setAnalysis(r.analysis);await onFilesChanged();}catch(e:any){alert(e.message)}finally{setBusy(false)}}
  const a=s.analysis;
  return <div className="modal-backdrop"><div className="modal conversion-modal"><div className="modal-head"><div><Hammer size={18}/><div><b>Centro de Conversão Android → iOS</b><small>análise estática + scaffold + agente + CI macOS</small></div></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="modal-body">
    {!a?<div className="conversion-empty"><Sparkles size={34}/><h2>Primeiro, entenda o projeto.</h2><p>O Studio identifica framework, bibliotecas Android-only e escolhe uma estratégia inicial antes de criar qualquer arquivo.</p><button className="primary" onClick={analyze} disabled={busy}>{busy?'Analisando...':'Analisar projeto agora'}</button></div>:<>
      <div className="score-row"><div className="score-ring" style={{'--score':`${a.migrationScore*3.6}deg`} as any}><div><b>{a.migrationScore}%</b><small>compatibilidade</small></div></div><div className="analysis-summary"><h2>{a.projectName}</h2><p>Estratégia recomendada: <b>{a.recommendedStrategy}</b></p><div className="chips">{a.androidSignals.map(x=><span key={x}>{x}</span>)}</div><small>{a.filesScanned} arquivos inspecionados</small></div><button className="ghost" onClick={analyze}><RefreshCw size={14}/>Reanalisar</button></div>
      <div className="two-cols"><div className="analysis-card"><h3><ShieldCheck size={16}/>Sinais favoráveis</h3>{a.signals.length?a.signals.map(x=><div className="check-line" key={x}><CheckCircle2 size={14}/>{x}</div>):<p>Nenhum framework multiplataforma já configurado.</p>}</div><div className="analysis-card warning"><h3><CircleAlert size={16}/>Bloqueadores iOS</h3>{a.iosBlockers.length?a.iosBlockers.map(x=><div className="check-line" key={x}><CircleAlert size={14}/>{x}</div>):<div className="check-line"><CheckCircle2 size={14}/>Nenhum bloqueador estático encontrado</div>}</div></div>
      <div className="pipeline"><div><span>1</span><b>Clone isolado</b><small>workspace atual</small></div><i/><div><span>2</span><b>Scaffold KMP/iOS</b><small>sem apagar Android</small></div><i/><div><span>3</span><b>Agente</b><small>migra e corrige</small></div><i/><div><span>4</span><b>Actions macOS</b><small>IPA sem assinatura</small></div></div>
      {created?<div className="success-box"><CheckCircle2/><div><b>Infraestrutura iOS criada.</b><p>{created.join(' · ')}</p><p>Agora use o chat do agente para migrar os recursos reais do app e depois envie para o novo repositório GitHub.</p></div></div>:<button className="primary wide big" onClick={scaffold} disabled={busy}>{busy?'Criando infraestrutura...':'Criar infraestrutura iOS no clone'}</button>}
    </>}
  </div></div></div>
}
