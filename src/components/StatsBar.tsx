import type { SimState } from '@/lib/marl-engine';
import { Activity, Package, AlertTriangle, Gauge } from 'lucide-react';

interface Props {
  state: SimState;
}

export default function StatsBar({ state }: Props) {
  const activeAgents = state.agents.filter(a => a.status === 'moving').length;
  const total = state.successfulDeliveries + state.failedDeliveries;
  const efficiency = total > 0 ? Math.round((state.successfulDeliveries / total) * 100) : 100;

  const stats = [
    { icon: Activity, label: 'Active Assets', value: activeAgents, sub: `/ ${state.agents.length}` },
    { icon: Package, label: 'Deliveries', value: state.successfulDeliveries, sub: `${state.failedDeliveries} failed` },
    { icon: AlertTriangle, label: 'Conflicts', value: state.totalCollisions, sub: 'total' },
    { icon: Gauge, label: 'Efficiency', value: `${efficiency}%`, sub: `${total} ops` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="panel p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <s.icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label} <span className="text-muted-foreground/60">· {s.sub}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}
