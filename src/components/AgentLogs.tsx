import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/lib/marl-engine';

interface Props {
  logs: LogEntry[];
}

const typeColors: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-neon-cyan',
  warning: 'text-neon-purple',
  error: 'text-destructive',
};

export default function AgentLogs({ logs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="glass-card p-4 h-full flex flex-col">
      <h3 className="font-mono text-xs tracking-widest uppercase text-muted-foreground mb-3">
        Agent Decision Feed
      </h3>
      <div ref={scrollRef} className="flex-1 overflow-y-auto terminal-scroll min-h-0 space-y-0.5">
        {logs.slice(-40).map((log, i) => (
          <div key={i} className={`font-mono text-[10px] leading-relaxed ${typeColors[log.type]}`}>
            <span className="text-muted-foreground/50">[{String(log.tick).padStart(4, '0')}]</span>{' '}
            <span className="text-neon-purple/70">Agent {String(log.agentId).padStart(2, '0')}</span>:{' '}
            {log.message}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="font-mono text-xs text-muted-foreground/30 italic">
            Awaiting simulation start...
          </div>
        )}
      </div>
    </div>
  );
}
