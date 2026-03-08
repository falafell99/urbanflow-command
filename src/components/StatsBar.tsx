import { useEffect, useState } from 'react';
import type { SimState } from '@/lib/marl-engine';
import { Activity, Package, AlertTriangle, Gauge, HeartPulse, Brain } from 'lucide-react';

interface Props {
  state: SimState;
  running: boolean;
}

export default function StatsBar({ state, running }: Props) {
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setEpoch(e => e + 1), 3000);
    return () => clearInterval(id);
  }, [running]);

  const activeAgents = state.agents.filter(a => a.status === 'moving').length;
  const total = state.successfulDeliveries + state.failedDeliveries;
  const efficiency = total > 0 ? Math.round((state.successfulDeliveries / total) * 100) : 100;

  const stats = [
    { icon: Activity, label: 'Active Assets', value: activeAgents, sub: `/ ${state.agents.length}` },
    { icon: Package, label: 'Deliveries', value: state.successfulDeliveries, sub: `${state.failedDeliveries} failed` },
    { icon: AlertTriangle, label: 'Conflicts', value: state.totalCollisions, sub: 'total' },
    { icon: Gauge, label: 'Efficiency', value: `${efficiency}%`, sub: `${total} ops` },
    {
      icon: HeartPulse,
      label: 'System Health',
      value: state.totalCollisions < 10 ? 'Stable' : state.totalCollisions < 30 ? 'Degraded' : 'Critical',
      sub: running ? 'online' : 'standby',
      pulse: true,
      healthStatus: state.totalCollisions < 10 ? 'stable' : state.totalCollisions < 30 ? 'degraded' : 'critical',
    },
    { icon: Brain, label: 'Training Epoch', value: epoch, sub: `tick ${state.tick}` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map(s => (
        <div key={s.label} className="panel p-4 flex items-center gap-3">
          <div className={`p-2 rounded-md ${
            'healthStatus' in s
              ? s.healthStatus === 'stable'
                ? 'bg-success/10'
                : s.healthStatus === 'degraded'
                  ? 'bg-warning/10'
                  : 'bg-destructive/10'
              : 'bg-primary/10'
          }`}>
            <s.icon className={`w-4 h-4 ${
              'healthStatus' in s
                ? s.healthStatus === 'stable'
                  ? 'text-success'
                  : s.healthStatus === 'degraded'
                    ? 'text-warning'
                    : 'text-destructive'
                : 'text-primary'
            }`} />
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-foreground flex items-center gap-1.5">
              {s.value}
              {'pulse' in s && s.pulse && running && (
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  s.healthStatus === 'stable' ? 'bg-success' : s.healthStatus === 'degraded' ? 'bg-warning' : 'bg-destructive'
                }`} />
              )}
            </div>
            <div className="text-xs text-muted-foreground">{s.label} <span className="text-muted-foreground/60">· {s.sub}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}
