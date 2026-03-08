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
    <div className="panel p-5 h-full flex flex-col items-center justify-center">
      <h3 className="text-sm font-medium text-foreground mb-4">Delivery Efficiency</h3>
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-2xl font-semibold text-foreground">{efficiency}%</span>
        </div>
      </div>
      <div className="mt-4 flex gap-6 text-xs font-mono text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success" />{state.successfulDeliveries} completed</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-destructive" />{state.failedDeliveries} failed</span>
      </div>
    </div>
  );
}
