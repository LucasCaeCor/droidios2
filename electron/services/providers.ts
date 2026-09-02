import type { ProviderConfig } from '../types';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderCallOptions {
  structured?: boolean;
}

const AGENT_RESPONSE_SCHEMA: any = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    toolRequests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['read_file', 'search_text'] },
          path: { type: 'string' },
          query: { type: 'string' }
        },
        required: ['type'],
        additionalProperties: false
      }
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['write_file', 'delete_file', 'run_command'] },
          path: { type: 'string' },
          content: { type: 'string' },
          reason: { type: 'string' },
          command: { type: 'string' },
          cwd: { type: 'string' }
        },
        required: ['type'],
        additionalProperties: false
      }
    },
    diagnostics: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['message', 'toolRequests', 'actions', 'diagnostics'],
  additionalProperties: false
};

export async function callProvider(
  config: ProviderConfig,
  messages: LlmMessage[],
  options: ProviderCallOptions = {}
): Promise<string> {
  if (config.provider === 'gemini') return callGemini(config, messages, options);
  if (config.provider === 'ollama') return callOllama(config, messages, options);
  return callOpenRouter(config, messages, options);
}

async function callOpenRouter(
  config: ProviderConfig,
  messages: LlmMessage[],
  options: ProviderCallOptions
) {
  if (!config.apiKey) {
    throw new Error('Informe a API key do OpenRouter nas configurações.');
  }

  const endpoint = config.baseUrl || 'https://openrouter.ai/api/v1/chat/completions';

  const body: any = {
    model: config.model || 'openrouter/free',
    messages,
    temperature: 0
  };

  if (options.structured) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'droid2ios_agent_response',
        strict: true,
        schema: AGENT_RESPONSE_SCHEMA
      }
    };
    body.plugins = [{ id: 'response-healing' }];
    body.provider = { require_parameters: true };
  }

  let res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://github.com/',
      'X-Title': 'Droid2iOS Studio'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok && options.structured && [400, 404, 422].includes(res.status)) {
    const firstError = await res.text();

    const fallbackBody: any = {
      model: config.model || 'openrouter/free',
      messages,
      temperature: 0,
      response_format: { type: 'json_object' },
      plugins: [{ id: 'response-healing' }]
    };

    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://github.com/',
        'X-Title': 'Droid2iOS Studio'
      },
      body: JSON.stringify(fallbackBody)
    });

    if (!res.ok) {
      const secondError = await res.text();
      throw new Error(
        `OpenRouter ${res.status}: ${secondError}\n` +
        `Falha anterior usando json_schema: ${firstError.slice(0, 1200)}`
      );
    }
  }

  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  }

  const json: any = await res.json();
  const choice = json.choices?.[0];

  if (choice?.finish_reason === 'length') {
    throw new Error(
      'OpenRouter interrompeu a resposta por limite de saída. ' +
      'O Droid2iOS deve continuar a migração em lotes menores.'
    );
  }

  const content = choice?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter retornou uma resposta vazia ou sem conteúdo textual.');
  }

  return content;
}

async function callGemini(
  config: ProviderConfig,
  messages: LlmMessage[],
  options: ProviderCallOptions
) {
  if (!config.apiKey) {
    throw new Error('Informe a API key do Gemini nas configurações.');
  }

  const model = config.model || 'gemini-3.7-flash';
  const system = messages
    .filter(m => m.role === 'system')
    .map(m => m.content)
    .join('\n\n');

  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const endpoint =
    config.baseUrl ||
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const generationConfig: any = { temperature: 0 };
  if (options.structured) generationConfig.responseMimeType = 'application/json';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }

  const json: any = await res.json();
  const candidate = json.candidates?.[0];

  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error(
      'Gemini interrompeu a resposta por limite de saída. ' +
      'O Droid2iOS deve continuar a migração em lotes menores.'
    );
  }

  const content =
    candidate?.content?.parts?.map((p: any) => p.text || '').join('') || '';

  if (!content.trim()) {
    throw new Error('Gemini retornou uma resposta vazia.');
  }

  return content;
}

async function callOllama(
  config: ProviderConfig,
  messages: LlmMessage[],
  options: ProviderCallOptions
) {
  const base = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');

  const body: any = {
    model: config.model || 'qwen2.5-coder:7b',
    messages,
    stream: false,
    options: { temperature: 0 }
  };

  if (options.structured) body.format = 'json';

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  }

  const json: any = await res.json();

  if (json.done_reason === 'length') {
    throw new Error(
      'Ollama interrompeu a resposta por limite de saída. ' +
      'O Droid2iOS deve continuar a migração em lotes menores.'
    );
  }

  const content = json.message?.content || '';

  if (!String(content).trim()) {
    throw new Error('Ollama retornou uma resposta vazia.');
  }

  return content;
}
