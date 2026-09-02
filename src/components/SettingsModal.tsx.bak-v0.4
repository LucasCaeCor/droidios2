import { Bot, CheckCircle2, KeyRound, Laptop, Save, TestTube2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AppSettings, ProviderConfig, ProviderName } from '../types';

const names: ProviderName[] = ['gemini', 'openrouter', 'ollama'];

const defaultsByName: Record<ProviderName, ProviderConfig> = {
  gemini: {
    provider: 'gemini',
    model: 'gemini-3.7-flash',
    enabled: false,
    fallbackModels: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash']
  },
  openrouter: {
    provider: 'openrouter',
    model: 'openrouter/free',
    enabled: false,
    fallbackModels: []
  },
  ollama: {
    provider: 'ollama',
    model: 'qwen3-coder:30b',
    baseUrl: 'http://localhost:11434',
    enabled: false,
    fallbackModels: []
  }
};

const defaults: AppSettings = {
  provider: { ...defaultsByName.openrouter },
  providers: names.map(n => ({ ...defaultsByName[n], fallbackModels: [...(defaultsByName[n].fallbackModels || [])] })),
  autoApplyAgentActions: false,
  autoFallbackAgent: true
};

function label(name: ProviderName) {
  if (name === 'openrouter') return 'OpenRouter';
  if (name === 'gemini') return 'Gemini API';
  return 'Ollama';
}

export default function SettingsModal({onClose}:{onClose:()=>void}) {
  const [settings,setSettings]=useState<AppSettings>(defaults);
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState('');

  useEffect(()=>{
    window.studio.settings.get().then(saved => {
      const providers = saved.providers?.length
        ? saved.providers
        : names.map(n => n === saved.provider.provider ? saved.provider : defaultsByName[n]);

      setSettings({
        ...defaults,
        ...saved,
        providers,
        autoFallbackAgent: saved.autoFallbackAgent ?? true
      });
    });
  },[]);

  const primaryName = settings.provider.provider;

  const current = useMemo(() => {
    return settings.providers.find(p => p.provider === primaryName) || settings.provider;
  }, [settings.providers, primaryName, settings.provider]);

  function updateProvider(name: ProviderName, patch: Partial<ProviderConfig>) {
    const nextProviders = names.map(n => {
      const existing = settings.providers.find(p => p.provider === n) || defaultsByName[n];
      return n === name ? { ...existing, ...patch, provider: n } : existing;
    });

    const nextPrimary = name === primaryName
      ? { ...(nextProviders.find(p => p.provider === name) || settings.provider) }
      : settings.provider;

    setSettings({ ...settings, providers: nextProviders, provider: nextPrimary });
  }

  function choosePrimary(name: ProviderName) {
    const existing = settings.providers.find(p => p.provider === name) || defaultsByName[name];
    const nextProviders = names.map(n => {
      const p = settings.providers.find(x => x.provider === n) || defaultsByName[n];
      return n === name ? { ...p, enabled: true } : p;
    });

    setSettings({
      ...settings,
      providers: nextProviders,
      provider: { ...existing, enabled: true }
    });
  }

  function setFallbackText(value: string) {
    const fallbackModels = value.split(',').map(v => v.trim()).filter(Boolean);
    updateProvider(primaryName, { fallbackModels });
  }

  async function save(){
    setBusy(true);
    try{
      const saved = await window.studio.settings.save(settings);
      setSettings(saved);
      setResult('Configurações salvas.');
    } finally {
      setBusy(false);
    }
  }

  async function test(){
    setBusy(true);
    setResult('');
    try{
      const saved = await window.studio.settings.save(settings);
      setSettings(saved);
      const r=await window.studio.agent.test();
      setResult(`Conexões: ${r}`);
    }catch(e:any){
      setResult(`Erro: ${e.message}`);
    }finally{
      setBusy(false);
    }
  }

  return <div className="modal-backdrop"><div className="modal settings-modal">
    <div className="modal-head">
      <div><Bot size={18}/><div><b>Configurações do agente</b><small>multi-provedor, fallback automático e GitHub</small></div></div>
      <button className="icon-btn" onClick={onClose}><X size={18}/></button>
    </div>

    <div className="modal-body settings-body">
      <section>
        <h3>Provedor primário</h3>
        <div className="provider-grid">
          <button className={primaryName==='gemini'?'selected':''} onClick={()=>choosePrimary('gemini')}>
            <Bot/><b>Gemini API</b><small>{settings.providers.find(p=>p.provider==='gemini')?.enabled?'habilitado':'desabilitado'}</small>
          </button>
          <button className={primaryName==='openrouter'?'selected':''} onClick={()=>choosePrimary('openrouter')}>
            <Bot/><b>OpenRouter</b><small>{settings.providers.find(p=>p.provider==='openrouter')?.enabled?'habilitado':'desabilitado'}</small>
          </button>
          <button className={primaryName==='ollama'?'selected':''} onClick={()=>choosePrimary('ollama')}>
            <Laptop/><b>Ollama</b><small>{settings.providers.find(p=>p.provider==='ollama')?.enabled?'habilitado':'desabilitado'}</small>
          </button>
        </div>
        <small style={{color:'#71808d'}}>Clique em um provedor para torná-lo primário e editar sua configuração abaixo. As configurações dos outros são preservadas.</small>
      </section>

      <section className="form-section">
        <h3>{label(primaryName)}</h3>

        <label className="check">
          <input
            type="checkbox"
            checked={current.enabled !== false}
            onChange={e=>updateProvider(primaryName,{enabled:e.target.checked})}
          />
          Habilitado para uso do agente
        </label>

        <label>Modelo principal</label>
        <input
          value={current.model}
          onChange={e=>updateProvider(primaryName,{model:e.target.value})}
        />

        <label>
          Modelos fallback
          <small> separados por vírgula; tentados na ordem</small>
        </label>
        <input
          value={(current.fallbackModels||[]).join(', ')}
          onChange={e=>setFallbackText(e.target.value)}
          placeholder={primaryName==='gemini'?'gemini-3.7-flash, gemini-3.6-flash, gemini-3.5-flash':'opcional'}
        />

        {primaryName!=='ollama'&&<>
          <label>API key</label>
          <div className="input-icon">
            <KeyRound size={15}/>
            <input
              type="password"
              value={current.apiKey||''}
              onChange={e=>updateProvider(primaryName,{apiKey:e.target.value})}
              placeholder={primaryName==='openrouter'?'sk-or-v1-...':'AIza...'}
            />
          </div>
        </>}

        {primaryName==='ollama'&&<>
          <label>URL do Ollama</label>
          <input
            value={current.baseUrl||'http://localhost:11434'}
            onChange={e=>updateProvider(primaryName,{baseUrl:e.target.value})}
          />
        </>}
      </section>

      <section className="form-section">
        <h3>Fallback automático</h3>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.autoFallbackAgent}
            onChange={e=>setSettings({...settings,autoFallbackAgent:e.target.checked})}
          />
          Trocar automaticamente de modelo/provedor em 429, 5xx, timeout ou indisponibilidade
        </label>
        <small style={{color:'#71808d'}}>
          O contexto da tarefa é reaproveitado integralmente. Gemini, OpenRouter e Ollama só entram no fallback quando estiverem habilitados.
        </small>

        <div style={{display:'grid',gap:8,marginTop:10}}>
          {names.map(name=>{
            const p=settings.providers.find(x=>x.provider===name)||defaultsByName[name];
            return <label className="check" key={name}>
              <input
                type="checkbox"
                checked={Boolean(p.enabled)}
                onChange={e=>updateProvider(name,{enabled:e.target.checked})}
              />
              {label(name)} — {p.model}
            </label>;
          })}
        </div>
      </section>

      <section className="form-section">
        <h3>GitHub</h3>
        <label>Personal Access Token <small>usado para criar repo, push e Actions</small></label>
        <div className="input-icon">
          <KeyRound size={15}/>
          <input
            type="password"
            value={settings.githubToken||''}
            onChange={e=>setSettings({...settings,githubToken:e.target.value})}
            placeholder="github_pat_... ou ghp_..."
          />
        </div>
      </section>

      <section className="form-section">
        <h3>Modo do agente</h3>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.autoApplyAgentActions}
            onChange={e=>setSettings({...settings,autoApplyAgentActions:e.target.checked})}
          />
          Aplicar automaticamente alterações e comandos propostos pelo agente
        </label>
        <small style={{color:'#71808d'}}>Desativado é o modo recomendado: você revisa cada arquivo/comando antes de aplicar.</small>
      </section>

      <section className="security-note">
        <CheckCircle2 size={17}/>
        <div>
          <b>Secrets e checkpoints ficam na sua máquina.</b>
          <p>API keys continuam protegidas pelo Electron safeStorage. O checkpoint do agente fica no userData do Studio e não é adicionado ao projeto nem ao Git.</p>
        </div>
      </section>

      {result&&<div className="test-result">{result}</div>}

      <div className="modal-actions">
        <button className="ghost" onClick={test} disabled={busy}><TestTube2 size={15}/>Testar habilitados</button>
        <button className="primary" onClick={save} disabled={busy}><Save size={15}/>Salvar</button>
      </div>
    </div>
  </div></div>;
}
