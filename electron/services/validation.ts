import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { getWorkspaceRoot, runCommand } from './workspace';

export interface ValidationReport {
  ran: boolean;
  command?: string;
  cwd?: string;
  code?: number;
  stdout?: string;
  stderr?: string;
  ok: boolean;
  reason: string;
  updatedAt: string;
}

let timer: NodeJS.Timeout | null = null;
let running: Promise<ValidationReport> | null = null;

function reportPath() {
  const root = getWorkspaceRoot();
  if (!root) return null;
  const key = Buffer.from(root).toString('base64url').slice(0, 80);
  return path.join(app.getPath('userData'), 'agent-validation', `${key}.json`);
}

function persist(report: ValidationReport) {
  const file = reportPath();
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
  } catch {
    // Não interrompe o IDE se o relatório não puder ser persistido.
  }
}

export function readLastValidation(): ValidationReport | null {
  const file = reportPath();
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as ValidationReport;
  } catch {
    return null;
  }
}

function exists(root: string, rel: string) {
  return fs.existsSync(path.join(root, rel));
}

function chooseValidation(): { command: string; cwd: string; reason: string } | null {
  const root = getWorkspaceRoot();
  if (!root) return null;

  const win = process.platform === 'win32';

  if (exists(root, 'ios-converted/settings.gradle.kts') || exists(root, 'ios-converted/settings.gradle')) {
    if (exists(root, 'gradlew') || exists(root, 'gradlew.bat')) {
      const wrapper = win ? '.\\gradlew.bat' : './gradlew';
      return {
        command: `${wrapper} -p ios-converted :composeApp:compileKotlinMetadata --stacktrace`,
        cwd: '.',
        reason: 'Compilar commonMain/KMP antes de continuar a migração.'
      };
    }

    if (exists(root, 'ios-converted/gradlew') || exists(root, 'ios-converted/gradlew.bat')) {
      const wrapper = win ? '.\\gradlew.bat' : './gradlew';
      return {
        command: `${wrapper} :composeApp:compileKotlinMetadata --stacktrace`,
        cwd: 'ios-converted',
        reason: 'Compilar commonMain/KMP antes de continuar a migração.'
      };
    }
  }

  if (exists(root, 'gradlew') || exists(root, 'gradlew.bat')) {
    const wrapper = win ? '.\\gradlew.bat' : './gradlew';
    return {
      command: `${wrapper} assembleDebug --stacktrace`,
      cwd: '.',
      reason: 'Validar que o Android existente continua compilando.'
    };
  }

  if (exists(root, 'package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      if (pkg?.scripts?.typecheck) {
        return { command: 'npm run typecheck', cwd: '.', reason: 'Executar typecheck do workspace.' };
      }
      if (pkg?.scripts?.build) {
        return { command: 'npm run build', cwd: '.', reason: 'Executar build do workspace.' };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export async function validateWorkspaceNow(): Promise<ValidationReport> {
  if (running) return running;

  running = (async () => {
    const selected = chooseValidation();

    if (!selected) {
      const report: ValidationReport = {
        ran: false,
        ok: true,
        reason: 'Nenhuma validação automática compatível foi detectada neste workspace.',
        updatedAt: new Date().toISOString()
      };
      persist(report);
      return report;
    }

    const result = await runCommand(selected.command, selected.cwd);
    const report: ValidationReport = {
      ran: true,
      command: selected.command,
      cwd: selected.cwd,
      code: result.code,
      stdout: result.stdout.slice(-40000),
      stderr: result.stderr.slice(-40000),
      ok: result.code === 0,
      reason: selected.reason,
      updatedAt: new Date().toISOString()
    };

    persist(report);
    return report;
  })();

  try {
    return await running;
  } finally {
    running = null;
  }
}

export function scheduleValidation(delayMs = 1400) {
  if (timer) clearTimeout(timer);

  timer = setTimeout(() => {
    timer = null;
    validateWorkspaceNow().catch(error => {
      persist({
        ran: true,
        ok: false,
        reason: `Falha ao iniciar validação automática: ${String(error?.message || error)}`,
        updatedAt: new Date().toISOString()
      });
    });
  }, delayMs);
}
