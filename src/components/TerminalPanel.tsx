import { Maximize2, RotateCcw, Terminal as TerminalIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export default function TerminalPanel(){
  const host=useRef<HTMLDivElement>(null); const termRef=useRef<Terminal|null>(null); const fitRef=useRef<FitAddon|null>(null);
  const [session,setSession]=useState(()=>crypto.randomUUID());
  useEffect(()=>{
    if(!host.current)return;
    const term=new Terminal({fontSize:12,fontFamily:'JetBrains Mono, Consolas, monospace',cursorBlink:true,convertEol:true,theme:{background:'#090d12',foreground:'#c7d1db',cursor:'#62d6ff'}});
    const fit=new FitAddon(); term.loadAddon(fit); term.open(host.current); fit.fit(); term.focus(); termRef.current=term; fitRef.current=fit;
    const cleanup=window.studio.terminal.onData(c=>{if(c.sessionId===session)term.write(c.data)});
    window.studio.terminal.create(session);
    term.onData(d=>window.studio.terminal.write(session,d));
    const ro=new ResizeObserver(()=>fit.fit()); ro.observe(host.current);
    return()=>{cleanup();ro.disconnect();window.studio.terminal.close(session);term.dispose()};
  },[session]);
  return <div className="terminal-panel"><div className="terminal-head"><div><TerminalIcon size={14}/>TERMINAL</div><div><button className="icon-btn tiny" title="Novo terminal" onClick={()=>setSession(crypto.randomUUID())}><RotateCcw size={13}/></button><button className="icon-btn tiny" title="Ajustar" onClick={()=>fitRef.current?.fit()}><Maximize2 size={13}/></button></div></div><div ref={host} className="terminal-host"/></div>
}
