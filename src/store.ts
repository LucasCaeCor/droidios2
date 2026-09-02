import { create } from 'zustand';
import type { AgentAction, FileNode, ProjectAnalysis } from './types';

export interface ChatMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string; actions?: AgentAction[]; diagnostics?: string[]; }
interface State {
  root: string | null;
  files: FileNode[];
  openPath: string | null;
  content: string;
  savedContent: string;
  analysis: ProjectAnalysis | null;
  chat: ChatMessage[];
  busy: string | null;
  setRoot(root:string|null):void;
  setFiles(files:FileNode[]):void;
  setOpen(path:string|null,content?:string):void;
  setContent(content:string):void;
  markSaved():void;
  setAnalysis(a:ProjectAnalysis|null):void;
  addChat(m:ChatMessage):void;
  updateAction(messageId:string, actionId:string):void;
  setBusy(v:string|null):void;
}

export const useStudio = create<State>((set) => ({
  root:null, files:[], openPath:null, content:'', savedContent:'', analysis:null, chat:[], busy:null,
  setRoot: root => set({root,files:[],openPath:null,content:'',savedContent:'',analysis:null,chat:[]}),
  setFiles: files => set({files}),
  setOpen: (openPath,content='') => set({openPath,content,savedContent:content}),
  setContent: content => set({content}),
  markSaved: () => set(s=>({savedContent:s.content})),
  setAnalysis: analysis => set({analysis}),
  addChat: m => set(s=>({chat:[...s.chat,m]})),
  updateAction: (messageId, actionId) => set(s=>({chat:s.chat.map(m=>m.id===messageId?{...m,actions:(m.actions||[]).filter(a=>a.id!==actionId)}:m)})),
  setBusy: busy => set({busy})
}));
