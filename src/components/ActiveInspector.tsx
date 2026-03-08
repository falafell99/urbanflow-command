import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Navigation, Battery, Clock, Target, Cpu, Copy, Check } from 'lucide-react';
import type { Agent } from '@/lib/marl-engine';

interface Props {
  agent: Agent | null;
  tick: number;
  onClose: () => void;
}

const objectives: Record<string, string> = {
  moving: 'En route to target sector',
  delivering: 'Completing delivery handoff',
  idle: 'Awaiting task assignment',
};

export default function ActiveInspector({ agent, tick, onClose }: Props) {
  const [confidence, setConfidence] = useState(92);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!agent) return;
    setConfidence(prev => {
      const delta = (Math.random() - 0.5) * 4;
      return Math.max(60, Math.min(99, prev + delta));
    });
  }, [tick, agent]);

  const copyUUID = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!agent) {
    return (
      <div className="panel p-5 h-full flex flex-col">
        <h3 className="text-sm font-medium text-foreground mb-4">Active Inspector</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center">
            Click an asset on the map<br />to inspect its live telemetry
          </p>
        </div>
      </div>
    );
  }

  const eta = agent.path.length > 0 ? agent.path.length * 0.2 : 0;
  const uuid = `#AG-${String(agent.id * 149 % 9999).padStart(4, '0')}`;

  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Active Inspector</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-4 flex-1">
        {/* UUID & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">{uuid}</span>
            <button
              onClick={() => copyUUID(uuid)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Copy UUID"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <Badge
            variant="outline"
            className={
              agent.status === 'moving'
                ? 'border-primary/40 text-primary text-[10px]'
                : agent.status === 'delivering'
                  ? 'border-success/40 text-success text-[10px]'
                  : 'border-muted-foreground/40 text-muted-foreground text-[10px]'
            }
          >
            {agent.status === 'moving' ? 'In Transit' : agent.status === 'delivering' ? 'Delivering' : 'Idle'}
          </Badge>
        </div>

        {/* Objective */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wider">Current Objective</span>
          </div>
          <p className="text-xs text-foreground font-mono">
            {agent.targetX !== null
              ? `${objectives[agent.status]} → (${agent.targetX}, ${agent.targetY})`
              : objectives[agent.status]}
          </p>
        </div>

        {/* Confidence */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Confidence Score</span>
            </div>
            <span className="font-mono text-xs text-foreground">{confidence.toFixed(1)}%</span>
          </div>
          <Progress value={confidence} className="h-1.5 bg-secondary" />
        </div>

        {/* Energy / Battery */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Battery className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Battery Level</span>
            </div>
            <span className={`font-mono text-xs ${(agent.energy ?? 100) < 30 ? 'text-destructive' : (agent.energy ?? 100) < 60 ? 'text-warning' : 'text-foreground'}`}>
              {(agent.energy ?? 100).toFixed(1)}%
            </span>
          </div>
          <Progress
            value={agent.energy ?? 100}
            className={`h-1.5 ${(agent.energy ?? 100) < 30 ? '[&>div]:bg-destructive' : (agent.energy ?? 100) < 60 ? '[&>div]:bg-warning' : ''} bg-secondary`}
          />
        </div>

        {/* ETA */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wider">Estimated Arrival</span>
          </div>
          <p className="font-mono text-xs text-foreground">
            {eta > 0 ? `${eta.toFixed(1)}s (${agent.path.length} steps)` : '— No active route'}
          </p>
        </div>

        {/* Velocity & Position */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Navigation className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Velocity</span>
            </div>
            <p className="font-mono text-xs text-foreground">{(agent.velocity ?? 0).toFixed(1)} u/t</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Position</span>
            <p className="font-mono text-xs text-foreground">({agent.x}, {agent.y})</p>
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Deliveries</span>
            <p className="font-mono text-sm font-semibold text-foreground">{agent.deliveries}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Conflicts</span>
            <p className="font-mono text-sm font-semibold text-destructive">{agent.collisions}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
