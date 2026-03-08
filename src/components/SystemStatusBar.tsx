import { useEffect, useState } from 'react';
import { Download, Server, Cpu, Clock, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SimState } from '@/lib/marl-engine';

interface Props {
  state: SimState;
  running: boolean;
}

export default function SystemStatusBar({ state, running }: Props) {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const downloadReport = () => {
    const report = {
      meta: { version: 'v1.0.4-stable', framework: 'PPO-CTDE', model: 'PPO-v2-Stable', exportedAt: new Date().toISOString() },
      simulation: {
        scenario: state.scenario,
        totalTicks: state.tick,
        agents: state.agents.length,
        successfulDeliveries: state.successfulDeliveries,
        failedDeliveries: state.failedDeliveries,
        totalCollisions: state.totalCollisions,
        totalReward: state.totalReward.toFixed(2),
        efficiency: state.successfulDeliveries + state.failedDeliveries > 0
          ? ((state.successfulDeliveries / (state.successfulDeliveries + state.failedDeliveries)) * 100).toFixed(1) + '%'
          : '100%',
      },
      hyperparameters: { note: 'See dashboard for live values' },
      rewardHistory: state.rewardHistory.slice(-100),
      lossHistory: state.lossHistory.slice(-100),
      topAgents: [...state.agents].sort((a, b) => b.deliveries - a.deliveries).slice(0, 10).map(a => ({
        id: a.id, deliveries: a.deliveries, collisions: a.collisions, energy: a.energy.toFixed(1),
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `urbanflow-training-report-${state.tick}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const items = [
    { icon: Clock, label: 'Uptime', value: formatUptime(uptime) },
    { icon: Server, label: 'Threads', value: '128' },
    { icon: Cpu, label: 'Model', value: 'PPO-v2' },
    { icon: Wifi, label: 'Status', value: running ? 'Live' : 'Idle' },
  ];

  return (
    <div className="border-b border-border bg-card/50 px-4 sm:px-6 h-9 flex items-center justify-between gap-4 text-[10px] font-mono text-muted-foreground">
      <div className="flex items-center gap-5">
        {items.map(item => (
          <span key={item.label} className="flex items-center gap-1.5">
            <item.icon className="w-3 h-3" />
            <span className="text-muted-foreground/60">{item.label}:</span>
            <span className="text-foreground/80">{item.value}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-foreground/80">99.9%</span>
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={downloadReport}
        className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-2"
      >
        <Download className="w-3 h-3" />
        <span className="hidden sm:inline">Export Report</span>
      </Button>
    </div>
  );
}
