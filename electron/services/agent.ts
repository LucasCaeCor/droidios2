import crypto from 'node:crypto';
import type { AgentAction, AgentResponse, ProjectAnalysis } from '../types';
import { loadSettings } from './settings';
import { callProvider, type LlmMessage } from './providers';
import { readFile, searchText, tree } from './workspace';

function systemPrompt() {
  return `Você é o agente principal do Droid2iOS Studio, um engenheiro sênior especializado em Android, Kotlin, Gradle, Kotlin Multiplatform, Compose Multiplatform, Swift, SwiftUI, Xcode e CI macOS.

Objetivo: migrar apps Android para iOS preservando comportamento e evitando alterações destrutivas. Você trabalha somente no clone atual. Prefira compartilhar lógica/UI via Kotlin Multiplatform quando o app usa Kotlin + Compose. Isole APIs Android específicas em androidMain e implemente equivalentes em iosMain. Nunca finja que uma API Android funciona no iOS.

Você tem contexto de árvore/arquivos. Quando precisar de mais contexto, solicite ferramentas de leitura. Responda SOMENTE em JSON válido, sem markdown, no formato:
{
  "message": "explicação curta em pt-BR",
  "toolRequests": [
    {"type":"read_file","path":"..."},
    {"type":"search_text","query":"..."}
  ],
  "actions": [
    {"type":"write_file","path":"...","content":"conteúdo completo","reason":"..."},
    {"type":"delete_file","path":"...","reason":"..."},
    {"type":"run_command","command":"...","cwd":".","reason":"..."}
  ],
  "diagnostics": ["..."]
}

Regras: use caminhos relativos; não modifique .git; não exponha secrets; não rode comandos destrutivos; para write_file sempre retorne o arquivo completo; limite ações a mudanças coerentes que possam ser revisadas. Se não houver ação, arrays vazios.`;
}

function parseJson(text: string): any {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(trimmed); } catch {}
  const start = trimmed.indexOf('{'); const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error('O modelo não retornou JSON estruturado. Tente novamente ou troque o modelo.');
}

function normalizeActions(input: any[]): AgentAction[] {
  if (!Array.isArray(input)) return [];
  return input.filter(Boolean).map(a => ({ ...a, id: crypto.randomUUID() })).filter(a =>
    ['write_file', 'delete_file', 'run_command'].includes(a.type) && (a.path || a.command)
  ) as AgentAction[];
}

export async function askAgent(params: {
  message: string;
  analysis?: ProjectAnalysis | null;
  openFile?: { path: string; content: string } | null;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<AgentResponse> {
  const settings = loadSettings();
  const shallowTree = tree('.', 2);
  const context = `ANÁLISE DO PROJETO:\n${JSON.stringify(params.analysis || {}, null, 2)}\n\nÁRVORE RESUMIDA:\n${JSON.stringify(shallowTree, null, 2)}\n\nARQUIVO ABERTO:\n${params.openFile ? `${params.openFile.path}\n${params.openFile.content.slice(0, 60000)}` : '(nenhum)'}`;
  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt() },
    ...(params.history || []).slice(-10).map(h => ({ role: h.role, content: h.content } as LlmMessage)),
    { role: 'user', content: `${context}\n\nPEDIDO DO USUÁRIO:\n${params.message}` }
  ];

  for (let pass = 0; pass < 4; pass++) {
    const raw = await callProvider(settings.provider, messages);
    const parsed = parseJson(raw);
    const toolRequests = Array.isArray(parsed.toolRequests) ? parsed.toolRequests.slice(0, 8) : [];
    if (!toolRequests.length) {
      return { message: parsed.message || 'Concluído.', actions: normalizeActions(parsed.actions), diagnostics: parsed.diagnostics || [] };
    }
    const outputs: any[] = [];
    for (const req of toolRequests) {
      try {
        if (req.type === 'read_file' && req.path) outputs.push({ request: req, result: readFile(req.path, 500_000) });
        else if (req.type === 'search_text' && req.query) outputs.push({ request: req, result: searchText(req.query, 60) });
      } catch (e: any) { outputs.push({ request: req, error: e.message }); }
    }
    messages.push({ role: 'assistant', content: raw });
    messages.push({ role: 'user', content: `RESULTADOS DAS FERRAMENTAS:\n${JSON.stringify(outputs).slice(0, 180000)}\nAgora responda com o JSON final ou solicite mais leituras.` });
  }
  throw new Error('O agente excedeu o limite de leituras automáticas desta rodada.');
}

export async function testProvider() {
  const settings = loadSettings();
  const text = await callProvider(settings.provider, [
    { role: 'system', content: 'Responda somente com OK.' },
    { role: 'user', content: 'Teste de conexão.' }
  ]);
  return text.trim().slice(0, 200);
}
