import type { SimState } from '@/lib/marl-engine';
import { Activity, Zap, AlertTriangle, Package } from 'lucide-react';

interface Props {
  state: SimState;
}

export default function StatsBar({ state }: Props) {
  const activeAgents = state.agents.filter(a => a.status === 'moving').length;
  const stats = [
    { icon: Activity, label: 'Active Agents', value: activeAgents, color: 'text-neon-cyan' },
    { icon: Package, label: 'Deliveries', value: state.successfulDeliveries, color: 'text-neon-cyan' },
    { icon: AlertTriangle, label: 'Collisions', value: state.totalCollisions, color: 'text-neon-purple' },
    { icon: Zap, label: 'Reward', value: Math.round(state.totalReward), color: 'text-neon-cyan' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="glass-card p-3 flex items-center gap-3">
          <s.icon className={`w-4 h-4 ${s.color} shrink-0`} />
          <div>
            <div className={`font-mono text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
