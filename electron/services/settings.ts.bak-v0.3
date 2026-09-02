import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings } from '../types';

const defaults: AppSettings = {
  provider: { provider: 'openrouter', model: 'openrouter/free' },
  autoApplyAgentActions: false
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

export function loadSettings(): AppSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    return {
      ...defaults,
      ...raw,
      provider: {
        ...defaults.provider,
        ...raw.provider,
        apiKey: decrypt(raw.provider?.apiKey)
      },
      githubToken: decrypt(raw.githubToken)
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(next: AppSettings): AppSettings {
  const out = {
    ...next,
    provider: { ...next.provider, apiKey: encrypt(next.provider.apiKey) },
    githubToken: encrypt(next.githubToken)
  };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(out, null, 2));
  return next;
}
