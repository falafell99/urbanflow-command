import { Slider } from '@/components/ui/slider';
import type { Hyperparams } from '@/lib/marl-engine';

interface Props {
  params: Hyperparams;
  onChange: (params: Hyperparams) => void;
}

export default function HyperparamPanel({ params, onChange }: Props) {
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
      </div>
    </div>
  );
}
