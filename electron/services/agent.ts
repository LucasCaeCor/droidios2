import crypto from 'node:crypto';
import type { AgentAction, AgentResponse, ProjectAnalysis } from '../types';
import { loadSettings } from './settings';
import { callProvider, type LlmMessage } from './providers';
import { readFile, searchText, tree } from './workspace';

function systemPrompt() {
  return `Você é o agente principal do Droid2iOS Studio, um engenheiro sênior especializado em Android, Kotlin, Gradle, Kotlin Multiplatform, Compose Multiplatform, Swift, SwiftUI, Xcode e CI macOS.

Objetivo: migrar apps Android para iOS preservando comportamento e evitando alterações destrutivas. Você trabalha somente no clone atual. Prefira compartilhar lógica/UI via Kotlin Multiplatform quando o app usa Kotlin + Compose. Isole APIs Android específicas em androidMain e implemente equivalentes em iosMain. Nunca finja que uma API Android funciona no iOS.

Você tem contexto de árvore/arquivos. Quando precisar de mais contexto, solicite ferramentas de leitura.

IMPORTANTE PARA PROJETOS GRANDES:
- Um pedido como "converta todo o projeto" representa um objetivo de longo prazo, não uma única resposta.
- Trabalhe incrementalmente em lotes pequenos e compiláveis.
- Em cada rodada, proponha no máximo 3 ações.
- Não tente devolver dezenas de arquivos completos em uma única resposta.
- Primeiro descubra dependências e arquivos relevantes; depois migre por domínio/feature.
- Preserve regras de negócio. Não remova recursos apenas para fazer o build passar.
- Se ainda faltar trabalho depois da rodada atual, diga claramente no campo message qual é o próximo lote recomendado.

Responda SOMENTE em JSON válido, sem markdown, no formato:
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

Regras: use caminhos relativos; não modifique .git; não exponha secrets; não rode comandos destrutivos; para write_file sempre retorne o arquivo completo; se não houver ação, arrays vazios. O JSON precisa ser sintaticamente válido e não pode ter texto antes ou depois do objeto.`;
}

function escapeRawControlCharsInsideStrings(input: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (const ch of input) {
    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }

    if (ch === '\n') {
      out += '\\n';
      continue;
    }

    if (ch === '\r') {
      out += '\\r';
      continue;
    }

    if (ch === '\t') {
      out += '\\t';
      continue;
    }

    out += ch;
  }

  return out;
}

function parseJson(text: string): any {
  const raw = String(text || '').trim();
  const unfenced = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const candidates: string[] = [];
  if (unfenced) candidates.push(unfenced);

  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const extracted = unfenced.slice(start, end + 1);
    if (!candidates.includes(extracted)) candidates.push(extracted);
  }

  let lastError: unknown = null;

  for (const candidate of candidates) {
    const escapedControls = escapeRawControlCharsInsideStrings(candidate);
    const attempts = [
      candidate,
      candidate.replace(/,\s*([}\]])/g, '$1'),
      escapedControls,
      escapedControls.replace(/,\s*([}\]])/g, '$1')
    ];

    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt);
      } catch (error) {
        lastError = error;
      }
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : 'JSON inválido';
  const preview = raw.slice(0, 1200).replace(/\s+/g, ' ');

  throw new Error(
    `Resposta estruturada inválida do modelo: ${detail}. ` +
    `A resposta pode ter sido truncada ou conter código não escapado. ` +
    `Trecho recebido: ${preview}`
  );
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
    const raw = await callProvider(settings.provider, messages, { structured: true });

    let parsed: any;

    try {
      parsed = parseJson(raw);
    } catch (parseError: any) {
      messages.push({
        role: 'assistant',
        content: raw.slice(0, 60000)
      });

      messages.push({
        role: 'user',
        content:
          'Sua resposta anterior não era JSON válido. ' +
          'Refaça a mesma etapa em JSON válido, sem markdown, com no máximo 2 ações. ' +
          'Se o conteúdo de um arquivo for grande demais, adie esse arquivo para a próxima rodada. ' +
          'Erro do parser: ' + String(parseError?.message || parseError).slice(0, 1200)
      });

      continue;
    }
    const toolRequests = Array.isArray(parsed.toolRequests) ? parsed.toolRequests.slice(0, 6) : [];
    if (!toolRequests.length) {
      return { message: parsed.message || 'Concluído.', actions: normalizeActions(parsed.actions).slice(0, 3), diagnostics: parsed.diagnostics || [] };
    }
    const outputs: any[] = [];
    for (const req of toolRequests) {
      try {
        if (req.type === 'read_file' && req.path) outputs.push({ request: req, result: readFile(req.path, 300_000) });
        else if (req.type === 'search_text' && req.query) outputs.push({ request: req, result: searchText(req.query, 60) });
      } catch (e: any) { outputs.push({ request: req, error: e.message }); }
    }
    messages.push({ role: 'assistant', content: raw });
    messages.push({ role: 'user', content: `RESULTADOS DAS FERRAMENTAS:\n${JSON.stringify(outputs).slice(0, 120000)}\nAgora responda com o JSON final ou solicite mais leituras.` });
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
