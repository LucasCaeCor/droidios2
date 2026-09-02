import fs from 'node:fs';
import path from 'node:path';
import type { ProjectAnalysis } from '../types';
import { getWorkspaceRoot } from './workspace';

const ignore = new Set(['.git', 'node_modules', '.gradle', 'build', 'dist', '.idea', '.kotlin', 'release']);

export function analyzeProject(): ProjectAnalysis {
  const root = getWorkspaceRoot();
  if (!root) throw new Error('Nenhum projeto aberto.');
  const counts: Record<string, number> = {};
  const signals = new Set<string>();
  const android = new Set<string>();
  const blockers = new Set<string>();
  let filesScanned = 0;

  function scanFile(file: string) {
    filesScanned++;
    const ext = path.extname(file).toLowerCase() || path.basename(file);
    counts[ext] = (counts[ext] || 0) + 1;
    if (filesScanned > 3500) return;
    let text = '';
    try {
      const stat = fs.statSync(file);
      if (stat.size > 800_000) return;
      text = fs.readFileSync(file, 'utf8');
    } catch { return; }

    const lower = text.toLowerCase();
    if (lower.includes('com.android.application') || lower.includes('com.android.library')) android.add('Android Gradle Plugin');
    if (lower.includes('androidx.compose') || lower.includes('jetpack compose')) { signals.add('Jetpack Compose'); android.add('Jetpack Compose'); }
    if (lower.includes('androidx.room') || lower.includes('@database')) { android.add('Room'); blockers.add('Room requer camada multiplataforma ou implementação iOS'); }
    if (lower.includes('dagger.hilt') || lower.includes('hiltandroid')) { android.add('Hilt'); blockers.add('Hilt é Android/JVM; migrar DI para Koin/manual/common'); }
    if (lower.includes('androidx.work') || lower.includes('workmanager')) { android.add('WorkManager'); blockers.add('WorkManager precisa de equivalente iOS'); }
    if (lower.includes('com.google.firebase') || lower.includes('firebase-')) { android.add('Firebase'); blockers.add('Firebase precisa de configuração/SDK iOS'); }
    if (lower.includes('android.content.context') || lower.includes('import android.')) blockers.add('APIs android.* precisam ser isoladas de commonMain');
    if (lower.includes('androidx.datastore')) { android.add('DataStore'); blockers.add('DataStore precisa ser isolado/substituído para iOS'); }
    if (lower.includes('flutter')) signals.add('Flutter');
    if (lower.includes('react-native') || lower.includes('reactnative')) signals.add('React Native');
    if (lower.includes('kotlin("multiplatform")') || lower.includes('org.jetbrains.kotlin.multiplatform')) signals.add('Kotlin Multiplatform');
  }

  function walk(dir: string) {
    if (filesScanned > 3500) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignore.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else scanFile(full);
    }
  }
  walk(root);

  const hasCompose = signals.has('Jetpack Compose');
  const hasFlutter = signals.has('Flutter');
  const hasRN = signals.has('React Native');
  let strategy: ProjectAnalysis['recommendedStrategy'] = 'manual-native';
  if (hasFlutter) strategy = 'flutter-ios';
  else if (hasRN) strategy = 'react-native-ios';
  else if (hasCompose || (counts['.kt'] || 0) > (counts['.java'] || 0)) strategy = 'compose-multiplatform';

  let score = strategy === 'compose-multiplatform' ? 88 : strategy === 'flutter-ios' || strategy === 'react-native-ios' ? 92 : 55;
  score -= Math.min(40, blockers.size * 6);
  if (signals.has('Kotlin Multiplatform')) score += 8;
  score = Math.max(10, Math.min(99, score));

  const projectName = path.basename(root);
  return {
    projectName,
    root,
    languages: counts,
    signals: [...signals],
    androidSignals: [...android],
    iosBlockers: [...blockers],
    migrationScore: score,
    recommendedStrategy: strategy,
    filesScanned
  };
}
