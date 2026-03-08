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
  ];

  return (
    <div className="panel p-5 h-full flex flex-col">
      <h3 className="text-sm font-medium text-foreground mb-5">System Parameters</h3>
      <div className="space-y-5 flex-1">
        {items.map(item => (
          <div key={item.key}>
            <div className="flex justify-between mb-2">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="font-mono text-xs text-foreground">{item.value.toFixed(3)}</span>
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

        {/* Congestion Toggle */}
        <div className="border-t border-border pt-4">
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
