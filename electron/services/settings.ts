import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings, ProviderConfig, ProviderName } from '../types';

const providerDefaults: Record<ProviderName, ProviderConfig> = {
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
  provider: { ...providerDefaults.openrouter },
  providers: Object.values(providerDefaults).map(p => ({ ...p, fallbackModels: [...(p.fallbackModels || [])] })),
  autoApplyAgentActions: false,
  autoFallbackAgent: true
};

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function encrypt(value?: string) {
  if (!value) return undefined;
  if (safeStorage.isEncryptionAvailable()) {
    return `enc:${safeStorage.encryptString(value).toString('base64')}`;
  }
  return `plain:${Buffer.from(value, 'utf8').toString('base64')}`;
}

function decrypt(value?: string) {
  if (!value) return undefined;
  try {
    if (value.startsWith('enc:') && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
    }
    if (value.startsWith('plain:')) {
      return Buffer.from(value.slice(6), 'base64').toString('utf8');
    }
    return value;
  } catch {
    return undefined;
  }
}

function normalizeFallbackModels(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(x => String(x).trim()).filter(Boolean))].slice(0, 8);
}

function hydrateProvider(raw: any, name: ProviderName): ProviderConfig {
  const base = providerDefaults[name];
  const merged = { ...base, ...(raw || {}), provider: name };
  return {
    ...merged,
    apiKey: decrypt(raw?.apiKey),
    enabled: Boolean(merged.enabled),
    fallbackModels: normalizeFallbackModels(merged.fallbackModels)
  };
}

function mergeProviders(raw: any): ProviderConfig[] {
  const rawProviders = Array.isArray(raw?.providers) ? raw.providers : [];
  const legacyRaw = raw?.provider;
  const legacyName: ProviderName =
    legacyRaw?.provider === 'gemini' || legacyRaw?.provider === 'ollama'
      ? legacyRaw.provider
      : 'openrouter';

  return (['gemini', 'openrouter', 'ollama'] as ProviderName[]).map(name => {
    const saved = rawProviders.find((p: any) => p?.provider === name);
    const legacy = legacyName === name ? legacyRaw : undefined;
    const combined = { ...(saved || {}), ...(legacy || {}) };

    // Migração da configuração antiga: o provedor que já estava selecionado
    // continua habilitado automaticamente.
    if (legacy && combined.enabled === undefined) combined.enabled = true;

    const hydrated = hydrateProvider(combined, name);

    // Se havia chave salva para um provedor, considerar habilitado na migração.
    if (hydrated.apiKey && combined.enabled === undefined) hydrated.enabled = true;

    return hydrated;
  });
}

export function loadSettings(): AppSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    const providers = mergeProviders(raw);

    const desiredName: ProviderName =
      raw?.provider?.provider === 'gemini' || raw?.provider?.provider === 'ollama'
        ? raw.provider.provider
        : 'openrouter';

    const primary =
      providers.find(p => p.provider === desiredName) ||
      providers.find(p => p.enabled) ||
      providers[0];

    return {
      ...defaults,
      ...raw,
      providers,
      provider: { ...primary },
      autoFallbackAgent: raw?.autoFallbackAgent ?? true,
      autoApplyAgentActions: Boolean(raw?.autoApplyAgentActions),
      githubToken: decrypt(raw?.githubToken)
    };
  } catch {
    return {
      ...defaults,
      provider: { ...defaults.provider },
      providers: defaults.providers.map(p => ({ ...p, fallbackModels: [...(p.fallbackModels || [])] }))
    };
  }
}

export function saveSettings(next: AppSettings): AppSettings {
  const providers = (next.providers?.length ? next.providers : [next.provider]).map(p => ({
    ...providerDefaults[p.provider],
    ...p,
    fallbackModels: normalizeFallbackModels(p.fallbackModels)
  }));

  const primary =
    providers.find(p => p.provider === next.provider.provider) ||
    providers.find(p => p.enabled) ||
    providers[0];

  const normalized: AppSettings = {
    ...next,
    provider: { ...primary },
    providers,
    autoFallbackAgent: next.autoFallbackAgent ?? true
  };

  const out = {
    ...normalized,
    provider: { ...normalized.provider, apiKey: encrypt(normalized.provider.apiKey) },
    providers: normalized.providers.map(p => ({ ...p, apiKey: encrypt(p.apiKey) })),
    githubToken: encrypt(normalized.githubToken)
  };

  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(out, null, 2));
  return normalized;
}
