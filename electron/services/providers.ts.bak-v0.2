import type { ProviderConfig } from '../types';

export interface LlmMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export async function callProvider(config: ProviderConfig, messages: LlmMessage[]): Promise<string> {
  if (config.provider === 'gemini') return callGemini(config, messages);
  if (config.provider === 'ollama') return callOllama(config, messages);
  return callOpenRouter(config, messages);
}

async function callOpenRouter(config: ProviderConfig, messages: LlmMessage[]) {
  if (!config.apiKey) throw new Error('Informe a API key do OpenRouter nas configurações.');
  const res = await fetch(config.baseUrl || 'https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://github.com/',
      'X-Title': 'Droid2iOS Studio'
    },
    body: JSON.stringify({ model: config.model || 'openrouter/free', messages, temperature: 0.15 })
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

async function callGemini(config: ProviderConfig, messages: LlmMessage[]) {
  if (!config.apiKey) throw new Error('Informe a API key do Gemini nas configurações.');
  const model = config.model || 'gemini-3.7-flash';
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const endpoint = config.baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.15 } })
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  return json.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
}

async function callOllama(config: ProviderConfig, messages: LlmMessage[]) {
  const base = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model || 'qwen2.5-coder:7b', messages, stream: false, options: { temperature: 0.15 } })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  return json.message?.content || '';
}
