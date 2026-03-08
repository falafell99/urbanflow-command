import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/lib/marl-engine';

interface Props {
  logs: LogEntry[];
}

const typeColors: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

const typePrefix: Record<string, string> = {
  info: 'INF',
  success: 'OK ',
  warning: 'WRN',
  error: 'ERR',
};

export default function AgentLogs({ logs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Telemetry Feed</h3>
        <span className="font-mono text-[10px] text-muted-foreground">{logs.length} events</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto terminal-scroll min-h-0 space-y-px bg-background/50 rounded-md p-3">
        {logs.slice(-50).map((log, i) => (
          <div key={i} className={`font-mono text-[11px] leading-relaxed ${typeColors[log.type]}`}>
            <span className="text-muted-foreground/40">{String(log.tick).padStart(4, '0')}</span>{' '}
            <span className={`${typeColors[log.type]} opacity-70`}>[{typePrefix[log.type]}]</span>{' '}
            <span className="text-foreground/60">Node {String(log.agentId).padStart(3, '0')}:</span>{' '}
            {log.message}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="font-mono text-xs text-muted-foreground/40">
            System idle — awaiting simulation start
          </div>
        )}
      </div>
    </div>
  );
}
