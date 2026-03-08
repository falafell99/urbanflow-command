import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Hyperparams } from '@/lib/marl-engine';

interface Props {
  params: Hyperparams;
  onChange: (params: Hyperparams) => void;
  congestionMode: boolean;
  onCongestionToggle: (v: boolean) => void;
}

export default function HyperparamPanel({ params, onChange, congestionMode, onCongestionToggle }: Props) {
  const items = [
    { key: 'learningRate' as const, label: 'Learning Rate (α)', min: 0.001, max: 0.1, step: 0.001, value: params.learningRate },
    { key: 'discountFactor' as const, label: 'Discount Factor (γ)', min: 0.8, max: 0.999, step: 0.001, value: params.discountFactor },
    { key: 'explorationRate' as const, label: 'Exploration Rate (ε)', min: 0.01, max: 0.5, step: 0.01, value: params.explorationRate },
    { key: 'collisionPenalty' as const, label: 'Collision Penalty', min: 0, max: 100, step: 1, value: params.collisionPenalty },
  ];

  return (
    <div className="panel p-5 h-full flex flex-col">
      <h3 className="text-sm font-medium text-foreground mb-5">System Parameters</h3>
      <div className="space-y-4 flex-1">
        {items.map(item => (
          <div key={item.key}>
            <div className="flex justify-between mb-2">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="font-mono text-xs text-foreground">
                {item.key === 'collisionPenalty' ? item.value : item.value.toFixed(3)}
              </span>
            </div>
            <Slider
              value={[item.value]}
              min={item.min}
              max={item.max}
              step={item.step}
              onValueChange={([v]) => onChange({ ...params, [item.key]: v })}
            />
          </div>
        ))}

        {/* Speed vs Safety Toggle */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed-safety" className="text-xs text-muted-foreground cursor-pointer">
              {params.speedVsSafety === 'speed' ? '⚡ Speed Priority' : '🛡 Safety Priority'}
            </Label>
            <Switch
              id="speed-safety"
              checked={params.speedVsSafety === 'safety'}
              onCheckedChange={(v) => onChange({ ...params, speedVsSafety: v ? 'safety' : 'speed' })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">
            {params.speedVsSafety === 'speed' ? 'Agents prioritize throughput over collision avoidance' : 'Agents prioritize safe routing — reduced velocity'}
          </p>
        </div>

        {/* Congestion Toggle */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="congestion" className="text-xs text-muted-foreground cursor-pointer">
              Simulate Network Congestion
            </Label>
            <Switch
              id="congestion"
              checked={congestionMode}
              onCheckedChange={onCongestionToggle}
              className={congestionMode ? '[&>span]:bg-warning' : ''}
            />
          </div>
          {congestionMode && (
            <p className="text-[10px] text-warning font-mono mt-2">
              ⚠ High latency injection active — performance degraded
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
