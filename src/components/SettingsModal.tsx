import { Bot, CheckCircle2, ExternalLink, KeyRound, Laptop, Save, TestTube2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AppSettings, ProviderName } from '../types';

const defaults:AppSettings={provider:{provider:'openrouter',model:'openrouter/free'},autoApplyAgentActions:false};
export default function SettingsModal({onClose}:{onClose:()=>void}){
  const [settings,setSettings]=useState<AppSettings>(defaults); const [busy,setBusy]=useState(false); const [result,setResult]=useState('');
  useEffect(()=>{window.studio.settings.get().then(setSettings)},[]);
  const provider=settings.provider.provider;
  function changeProvider(p:ProviderName){
    const model=p==='openrouter'?'openrouter/free':p==='gemini'?'gemini-3.7-flash':'qwen2.5-coder:7b';
    setSettings({...settings,provider:{provider:p,model,baseUrl:p==='ollama'?'http://localhost:11434':undefined}});
  }
  async function save(){setBusy(true);try{await window.studio.settings.save(settings);setResult('Configurações salvas.')}finally{setBusy(false)}}
  async function test(){setBusy(true);setResult('');try{await window.studio.settings.save(settings);const r=await window.studio.agent.test();setResult(`Conexão OK: ${r}`)}catch(e:any){setResult(`Erro: ${e.message}`)}finally{setBusy(false)}}
  return <div className="modal-backdrop"><div className="modal settings-modal"><div className="modal-head"><div><Bot size={18}/><div><b>Configurações do agente</b><small>provedor LLM e integração GitHub</small></div></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="modal-body settings-body">
    <section><h3>Provedor de IA</h3><div className="provider-grid"><button className={provider==='openrouter'?'selected':''} onClick={()=>changeProvider('openrouter')}><Bot/><b>OpenRouter</b><small>Free Models Router</small></button><button className={provider==='gemini'?'selected':''} onClick={()=>changeProvider('gemini')}><Bot/><b>Gemini API</b><small>free tier</small></button><button className={provider==='ollama'?'selected':''} onClick={()=>changeProvider('ollama')}><Laptop/><b>Ollama</b><small>100% local</small></button></div></section>
    <section className="form-section"><label>Modelo</label><input value={settings.provider.model} onChange={e=>setSettings({...settings,provider:{...settings.provider,model:e.target.value}})}/>{provider!=='ollama'&&<><label>API key</label><div className="input-icon"><KeyRound size={15}/><input type="password" value={settings.provider.apiKey||''} onChange={e=>setSettings({...settings,provider:{...settings.provider,apiKey:e.target.value}})} placeholder={provider==='openrouter'?'sk-or-v1-...':'AIza...'}/></div></>}{provider==='ollama'&&<><label>URL do Ollama</label><input value={settings.provider.baseUrl||''} onChange={e=>setSettings({...settings,provider:{...settings.provider,baseUrl:e.target.value}})}/></>}</section>
    <section className="form-section"><h3>GitHub</h3><label>Personal Access Token <small>usado para criar repo, push e Actions</small></label><div className="input-icon"><KeyRound size={15}/><input type="password" value={settings.githubToken||''} onChange={e=>setSettings({...settings,githubToken:e.target.value})} placeholder="github_pat_... ou ghp_..."/></div></section>
    <section className="form-section"><h3>Modo do agente</h3><label className="check"><input type="checkbox" checked={settings.autoApplyAgentActions} onChange={e=>setSettings({...settings,autoApplyAgentActions:e.target.checked})}/>Aplicar automaticamente alterações e comandos propostos pelo agente</label><small style={{color:'#71808d'}}>Desativado é o modo recomendado: você revisa cada arquivo/comando antes de aplicar.</small></section><section className="security-note"><CheckCircle2 size={17}/><div><b>Secrets ficam na sua máquina.</b><p>O Studio usa Electron safeStorage quando o sistema operacional oferece criptografia segura. As chaves não são adicionadas ao projeto nem ao Git.</p></div></section>
    {result&&<div className="test-result">{result}</div>}
    <div className="modal-actions"><button className="ghost" onClick={test} disabled={busy}><TestTube2 size={15}/>Testar agente</button><button className="primary" onClick={save} disabled={busy}><Save size={15}/>Salvar</button></div>
  </div></div></div>
}
