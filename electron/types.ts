export type ProviderName = 'gemini' | 'openrouter' | 'ollama';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey?: string;
  model: string;
  baseUrl?: string;
}

export interface AppSettings {
  provider: ProviderConfig;
  githubToken?: string;
  autoApplyAgentActions: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
}

export interface ProjectAnalysis {
  projectName: string;
  root: string;
  languages: Record<string, number>;
  signals: string[];
  androidSignals: string[];
  iosBlockers: string[];
  migrationScore: number;
  recommendedStrategy: 'compose-multiplatform' | 'react-native-ios' | 'flutter-ios' | 'manual-native';
  filesScanned: number;
}

export type AgentAction =
  | { id: string; type: 'write_file'; path: string; content: string; reason: string }
  | { id: string; type: 'run_command'; command: string; cwd?: string; reason: string }
  | { id: string; type: 'delete_file'; path: string; reason: string };

export interface AgentResponse {
  message: string;
  actions: AgentAction[];
  diagnostics?: string[];
}

export interface TerminalChunk {
  sessionId: string;
  data: string;
}

export interface GitHubRun {
  id: number;
  name: string;
  status: string;
  conclusion?: string | null;
  htmlUrl: string;
  createdAt: string;
  branch: string;
}
