#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const agentPath = path.join(root, "electron", "services", "agent.ts");
const providersPath = path.join(root, "electron", "services", "providers.ts");

const PROVIDERS_TS = "import type { ProviderConfig } from '../types';\n\nexport interface LlmMessage {\n  role: 'system' | 'user' | 'assistant';\n  content: string;\n}\n\nexport interface ProviderCallOptions {\n  structured?: boolean;\n}\n\nconst AGENT_RESPONSE_SCHEMA: any = {\n  type: 'object',\n  properties: {\n    message: { type: 'string' },\n    toolRequests: {\n      type: 'array',\n      items: {\n        type: 'object',\n        properties: {\n          type: { type: 'string', enum: ['read_file', 'search_text'] },\n          path: { type: 'string' },\n          query: { type: 'string' }\n        },\n        required: ['type'],\n        additionalProperties: false\n      }\n    },\n    actions: {\n      type: 'array',\n      items: {\n        type: 'object',\n        properties: {\n          type: { type: 'string', enum: ['write_file', 'delete_file', 'run_command'] },\n          path: { type: 'string' },\n          content: { type: 'string' },\n          reason: { type: 'string' },\n          command: { type: 'string' },\n          cwd: { type: 'string' }\n        },\n        required: ['type'],\n        additionalProperties: false\n      }\n    },\n    diagnostics: {\n      type: 'array',\n      items: { type: 'string' }\n    }\n  },\n  required: ['message', 'toolRequests', 'actions', 'diagnostics'],\n  additionalProperties: false\n};\n\nexport async function callProvider(\n  config: ProviderConfig,\n  messages: LlmMessage[],\n  options: ProviderCallOptions = {}\n): Promise<string> {\n  if (config.provider === 'gemini') return callGemini(config, messages, options);\n  if (config.provider === 'ollama') return callOllama(config, messages, options);\n  return callOpenRouter(config, messages, options);\n}\n\nasync function callOpenRouter(\n  config: ProviderConfig,\n  messages: LlmMessage[],\n  options: ProviderCallOptions\n) {\n  if (!config.apiKey) {\n    throw new Error('Informe a API key do OpenRouter nas configurações.');\n  }\n\n  const endpoint = config.baseUrl || 'https://openrouter.ai/api/v1/chat/completions';\n\n  const body: any = {\n    model: config.model || 'openrouter/free',\n    messages,\n    temperature: 0\n  };\n\n  if (options.structured) {\n    body.response_format = {\n      type: 'json_schema',\n      json_schema: {\n        name: 'droid2ios_agent_response',\n        strict: true,\n        schema: AGENT_RESPONSE_SCHEMA\n      }\n    };\n    body.plugins = [{ id: 'response-healing' }];\n    body.provider = { require_parameters: true };\n  }\n\n  let res = await fetch(endpoint, {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n      'Authorization': `Bearer ${config.apiKey}`,\n      'HTTP-Referer': 'https://github.com/',\n      'X-Title': 'Droid2iOS Studio'\n    },\n    body: JSON.stringify(body)\n  });\n\n  if (!res.ok && options.structured && [400, 404, 422].includes(res.status)) {\n    const firstError = await res.text();\n\n    const fallbackBody: any = {\n      model: config.model || 'openrouter/free',\n      messages,\n      temperature: 0,\n      response_format: { type: 'json_object' },\n      plugins: [{ id: 'response-healing' }]\n    };\n\n    res = await fetch(endpoint, {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        'Authorization': `Bearer ${config.apiKey}`,\n        'HTTP-Referer': 'https://github.com/',\n        'X-Title': 'Droid2iOS Studio'\n      },\n      body: JSON.stringify(fallbackBody)\n    });\n\n    if (!res.ok) {\n      const secondError = await res.text();\n      throw new Error(\n        `OpenRouter ${res.status}: ${secondError}\\n` +\n        `Falha anterior usando json_schema: ${firstError.slice(0, 1200)}`\n      );\n    }\n  }\n\n  if (!res.ok) {\n    throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);\n  }\n\n  const json: any = await res.json();\n  const choice = json.choices?.[0];\n\n  if (choice?.finish_reason === 'length') {\n    throw new Error(\n      'OpenRouter interrompeu a resposta por limite de saída. ' +\n      'O Droid2iOS deve continuar a migração em lotes menores.'\n    );\n  }\n\n  const content = choice?.message?.content;\n\n  if (typeof content !== 'string' || !content.trim()) {\n    throw new Error('OpenRouter retornou uma resposta vazia ou sem conteúdo textual.');\n  }\n\n  return content;\n}\n\nasync function callGemini(\n  config: ProviderConfig,\n  messages: LlmMessage[],\n  options: ProviderCallOptions\n) {\n  if (!config.apiKey) {\n    throw new Error('Informe a API key do Gemini nas configurações.');\n  }\n\n  const model = config.model || 'gemini-3.7-flash';\n  const system = messages\n    .filter(m => m.role === 'system')\n    .map(m => m.content)\n    .join('\\n\\n');\n\n  const contents = messages\n    .filter(m => m.role !== 'system')\n    .map(m => ({\n      role: m.role === 'assistant' ? 'model' : 'user',\n      parts: [{ text: m.content }]\n    }));\n\n  const endpoint =\n    config.baseUrl ||\n    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;\n\n  const generationConfig: any = { temperature: 0 };\n  if (options.structured) generationConfig.responseMimeType = 'application/json';\n\n  const res = await fetch(endpoint, {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      systemInstruction: { parts: [{ text: system }] },\n      contents,\n      generationConfig\n    })\n  });\n\n  if (!res.ok) {\n    throw new Error(`Gemini ${res.status}: ${await res.text()}`);\n  }\n\n  const json: any = await res.json();\n  const candidate = json.candidates?.[0];\n\n  if (candidate?.finishReason === 'MAX_TOKENS') {\n    throw new Error(\n      'Gemini interrompeu a resposta por limite de saída. ' +\n      'O Droid2iOS deve continuar a migração em lotes menores.'\n    );\n  }\n\n  const content =\n    candidate?.content?.parts?.map((p: any) => p.text || '').join('') || '';\n\n  if (!content.trim()) {\n    throw new Error('Gemini retornou uma resposta vazia.');\n  }\n\n  return content;\n}\n\nasync function callOllama(\n  config: ProviderConfig,\n  messages: LlmMessage[],\n  options: ProviderCallOptions\n) {\n  const base = (config.baseUrl || 'http://localhost:11434').replace(/\\/$/, '');\n\n  const body: any = {\n    model: config.model || 'qwen2.5-coder:7b',\n    messages,\n    stream: false,\n    options: { temperature: 0 }\n  };\n\n  if (options.structured) body.format = 'json';\n\n  const res = await fetch(`${base}/api/chat`, {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(body)\n  });\n\n  if (!res.ok) {\n    throw new Error(`Ollama ${res.status}: ${await res.text()}`);\n  }\n\n  const json: any = await res.json();\n\n  if (json.done_reason === 'length') {\n    throw new Error(\n      'Ollama interrompeu a resposta por limite de saída. ' +\n      'O Droid2iOS deve continuar a migração em lotes menores.'\n    );\n  }\n\n  const content = json.message?.content || '';\n\n  if (!String(content).trim()) {\n    throw new Error('Ollama retornou uma resposta vazia.');\n  }\n\n  return content;\n}\n";
const SYSTEM_PROMPT_FN = "function systemPrompt() {\n  return `Você é o agente principal do Droid2iOS Studio, um engenheiro sênior especializado em Android, Kotlin, Gradle, Kotlin Multiplatform, Compose Multiplatform, Swift, SwiftUI, Xcode e CI macOS.\n\nObjetivo: migrar apps Android para iOS preservando comportamento e evitando alterações destrutivas. Você trabalha somente no clone atual. Prefira compartilhar lógica/UI via Kotlin Multiplatform quando o app usa Kotlin + Compose. Isole APIs Android específicas em androidMain e implemente equivalentes em iosMain. Nunca finja que uma API Android funciona no iOS.\n\nVocê tem contexto de árvore/arquivos. Quando precisar de mais contexto, solicite ferramentas de leitura.\n\nIMPORTANTE PARA PROJETOS GRANDES:\n- Um pedido como \"converta todo o projeto\" representa um objetivo de longo prazo, não uma única resposta.\n- Trabalhe incrementalmente em lotes pequenos e compiláveis.\n- Em cada rodada, proponha no máximo 3 ações.\n- Não tente devolver dezenas de arquivos completos em uma única resposta.\n- Primeiro descubra dependências e arquivos relevantes; depois migre por domínio/feature.\n- Preserve regras de negócio. Não remova recursos apenas para fazer o build passar.\n- Se ainda faltar trabalho depois da rodada atual, diga claramente no campo message qual é o próximo lote recomendado.\n\nResponda SOMENTE em JSON válido, sem markdown, no formato:\n{\n  \"message\": \"explicação curta em pt-BR\",\n  \"toolRequests\": [\n    {\"type\":\"read_file\",\"path\":\"...\"},\n    {\"type\":\"search_text\",\"query\":\"...\"}\n  ],\n  \"actions\": [\n    {\"type\":\"write_file\",\"path\":\"...\",\"content\":\"conteúdo completo\",\"reason\":\"...\"},\n    {\"type\":\"delete_file\",\"path\":\"...\",\"reason\":\"...\"},\n    {\"type\":\"run_command\",\"command\":\"...\",\"cwd\":\".\",\"reason\":\"...\"}\n  ],\n  \"diagnostics\": [\"...\"]\n}\n\nRegras: use caminhos relativos; não modifique .git; não exponha secrets; não rode comandos destrutivos; para write_file sempre retorne o arquivo completo; se não houver ação, arrays vazios. O JSON precisa ser sintaticamente válido e não pode ter texto antes ou depois do objeto.`;\n}";
const PARSE_FN = "function escapeRawControlCharsInsideStrings(input: string): string {\n  let out = '';\n  let inString = false;\n  let escaped = false;\n\n  for (const ch of input) {\n    if (!inString) {\n      out += ch;\n      if (ch === '\"') inString = true;\n      continue;\n    }\n\n    if (escaped) {\n      out += ch;\n      escaped = false;\n      continue;\n    }\n\n    if (ch === '\\\\') {\n      out += ch;\n      escaped = true;\n      continue;\n    }\n\n    if (ch === '\"') {\n      out += ch;\n      inString = false;\n      continue;\n    }\n\n    if (ch === '\\n') {\n      out += '\\\\n';\n      continue;\n    }\n\n    if (ch === '\\r') {\n      out += '\\\\r';\n      continue;\n    }\n\n    if (ch === '\\t') {\n      out += '\\\\t';\n      continue;\n    }\n\n    out += ch;\n  }\n\n  return out;\n}\n\nfunction parseJson(text: string): any {\n  const raw = String(text || '').trim();\n  const unfenced = raw\n    .replace(/^\\s*```(?:json)?\\s*/i, '')\n    .replace(/\\s*```\\s*$/i, '')\n    .trim();\n\n  const candidates: string[] = [];\n  if (unfenced) candidates.push(unfenced);\n\n  const start = unfenced.indexOf('{');\n  const end = unfenced.lastIndexOf('}');\n  if (start >= 0 && end > start) {\n    const extracted = unfenced.slice(start, end + 1);\n    if (!candidates.includes(extracted)) candidates.push(extracted);\n  }\n\n  let lastError: unknown = null;\n\n  for (const candidate of candidates) {\n    const escapedControls = escapeRawControlCharsInsideStrings(candidate);\n    const attempts = [\n      candidate,\n      candidate.replace(/,\\s*([}\\]])/g, '$1'),\n      escapedControls,\n      escapedControls.replace(/,\\s*([}\\]])/g, '$1')\n    ];\n\n    for (const attempt of attempts) {\n      try {\n        return JSON.parse(attempt);\n      } catch (error) {\n        lastError = error;\n      }\n    }\n  }\n\n  const detail =\n    lastError instanceof Error ? lastError.message : 'JSON inválido';\n  const preview = raw.slice(0, 1200).replace(/\\s+/g, ' ');\n\n  throw new Error(\n    `Resposta estruturada inválida do modelo: ${detail}. ` +\n    `A resposta pode ter sido truncada ou conter código não escapado. ` +\n    `Trecho recebido: ${preview}`\n  );\n}";
const ASK_REPLACEMENT = "const raw = await callProvider(settings.provider, messages, { structured: true });\n\n    let parsed: any;\n\n    try {\n      parsed = parseJson(raw);\n    } catch (parseError: any) {\n      messages.push({\n        role: 'assistant',\n        content: raw.slice(0, 60000)\n      });\n\n      messages.push({\n        role: 'user',\n        content:\n          'Sua resposta anterior não era JSON válido. ' +\n          'Refaça a mesma etapa em JSON válido, sem markdown, com no máximo 2 ações. ' +\n          'Se o conteúdo de um arquivo for grande demais, adie esse arquivo para a próxima rodada. ' +\n          'Erro do parser: ' + String(parseError?.message || parseError).slice(0, 1200)\n      });\n\n      continue;\n    }";

function fail(message) {
  console.error(`[v0.2.1] ERRO: ${message}`);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) fail(`Arquivo não encontrado: ${file}`);
  return fs.readFileSync(file, "utf8");
}

function backup(file, content) {
  const backupPath = `${file}.bak-v0.2.1`;
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, content, "utf8");
    console.log(`[v0.2.1] backup: ${path.relative(root, backupPath)}`);
  }
}

function replaceSection(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`Não encontrei o início de ${label}: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`Não encontrei o fim de ${label}: ${endMarker}`);
  return source.slice(0, start) + replacement.trimEnd() + "\n\n" + source.slice(end);
}

// providers.ts é pequeno e dedicado aos providers; reescrever evita patch parcial.
const oldProviders = read(providersPath);
backup(providersPath, oldProviders);
fs.writeFileSync(providersPath, PROVIDERS_TS, "utf8");
console.log("[v0.2.1] providers.ts atualizado");

let agent = read(agentPath);
backup(agentPath, agent);

agent = replaceSection(
  agent,
  "function systemPrompt()",
  "function parseJson",
  SYSTEM_PROMPT_FN,
  "systemPrompt"
);

agent = replaceSection(
  agent,
  "function parseJson",
  "function normalizeActions",
  PARSE_FN,
  "parseJson"
);

// Se a recuperação ainda não existe, troca callProvider + parseJson de forma tolerante.
if (!agent.includes("Sua resposta anterior não era JSON válido.")) {
  const rawOld = "const raw = await callProvider(settings.provider, messages);";
  const rawStructured = "const raw = await callProvider(settings.provider, messages, { structured: true });";

  let rawMarker = null;
  if (agent.includes(rawOld)) rawMarker = rawOld;
  else if (agent.includes(rawStructured)) rawMarker = rawStructured;

  if (!rawMarker) {
    fail("Não encontrei a chamada principal callProvider(settings.provider, messages) em agent.ts.");
  }

  const rawIndex = agent.indexOf(rawMarker);
  const parsedCandidates = [
    "const parsed = parseJson(raw);",
    "let parsed = parseJson(raw);",
    "let parsed: any = parseJson(raw);"
  ];

  let parsedMarker = null;
  let parsedIndex = -1;

  for (const candidate of parsedCandidates) {
    const idx = agent.indexOf(candidate, rawIndex);
    if (idx >= 0) {
      parsedMarker = candidate;
      parsedIndex = idx;
      break;
    }
  }

  if (!parsedMarker) {
    fail("Não encontrei parseJson(raw) logo após a chamada ao provider.");
  }

  const end = parsedIndex + parsedMarker.length;
  agent = agent.slice(0, rawIndex) + ASK_REPLACEMENT + agent.slice(end);
} else {
  console.log("[v0.2.1] recuperação de JSON já existia; mantida");
}

// Limites de lote/contexto.
agent = agent.replace(
  /parsed\.toolRequests\.slice\(0,\s*\d+\)/g,
  "parsed.toolRequests.slice(0, 6)"
);

agent = agent.replace(
  /actions:\s*normalizeActions\(parsed\.actions\)(?!\.slice)/g,
  "actions: normalizeActions(parsed.actions).slice(0, 3)"
);

agent = agent.replace(
  /actions:\s*normalizeActions\(parsed\.actions\)\.slice\(0,\s*\d+\)/g,
  "actions: normalizeActions(parsed.actions).slice(0, 3)"
);

agent = agent.replace(
  /readFile\(req\.path,\s*500_000\)/g,
  "readFile(req.path, 300_000)"
);

agent = agent.replace(
  /JSON\.stringify\(outputs\)\.slice\(0,\s*180000\)/g,
  "JSON.stringify(outputs).slice(0, 120000)"
);

fs.writeFileSync(agentPath, agent, "utf8");

console.log("[v0.2.1] agent.ts atualizado");
console.log("");
console.log("Aplicação concluída.");
console.log("Backups:");
console.log("  electron/services/providers.ts.bak-v0.2.1");
console.log("  electron/services/agent.ts.bak-v0.2.1");
console.log("");
console.log("Agora rode:");
console.log("  npm run typecheck");
console.log("  npm run build");
console.log("");
console.log("Depois:");
console.log('  git add .');
console.log('  git commit -m "fix: robustecer agent JSON v0.2.1"');
console.log("  git push origin main");
