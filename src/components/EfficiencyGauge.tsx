import type { SimState } from '@/lib/marl-engine';

interface Props {
  state: SimState;
}

export default function EfficiencyGauge({ state }: Props) {
  const total = state.successfulDeliveries + state.failedDeliveries;
  const efficiency = total > 0 ? Math.round((state.successfulDeliveries / total) * 100) : 100;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (efficiency / 100) * circumference;

  return (
    <div className="glass-card p-4 h-full flex flex-col items-center justify-center">
      <h3 className="font-mono text-xs tracking-widest uppercase text-muted-foreground mb-3">
        Efficiency Index
      </h3>
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(183, 100%, 50%)" />
              <stop offset="100%" stopColor="hsl(270, 100%, 65%)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-2xl font-bold neon-text-cyan">{efficiency}%</span>
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs font-mono text-muted-foreground">
        <span>✓ {state.successfulDeliveries}</span>
        <span>✗ {state.failedDeliveries}</span>
      </div>
    </div>
  );
}
