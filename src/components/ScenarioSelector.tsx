import { Radio, Zap, AlertTriangle } from 'lucide-react';
import type { Scenario } from '@/lib/marl-engine';

interface Props {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
  disabled: boolean;
}

const scenarios: { id: Scenario; label: string; desc: string; icon: typeof Radio }[] = [
  { id: 'standard', label: 'Standard Ops', desc: 'Normal traffic flow', icon: Radio },
  { id: 'peak', label: 'Peak Congestion', desc: '2× agent density', icon: Zap },
  { id: 'emergency', label: 'Emergency Reroute', desc: 'Blocked intersections', icon: AlertTriangle },
];

export default function ScenarioSelector({ scenario, onChange, disabled }: Props) {
  return (
    <div className="panel p-5 h-full flex flex-col">
      <h3 className="text-sm font-medium text-foreground mb-4">Scenario Mode</h3>
      <div className="space-y-2 flex-1">
        {scenarios.map(s => {
          const active = scenario === s.id;
          return (
            <button
              key={s.id}
              disabled={disabled}
              onClick={() => onChange(s.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-md border text-left transition-all ${
                active
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <s.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <div className={`text-xs font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      {disabled && (
        <p className="text-[10px] text-muted-foreground font-mono mt-3">
          Pause simulation to change scenario
        </p>
      )}
    </div>
  );
}
