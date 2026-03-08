import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import type { SimState } from '@/lib/marl-engine';

interface Props {
  state: SimState;
}

export default function LossCurve({ state }: Props) {
  const loss = state.lossHistory.slice(-80);
  const data = loss.map((val, i) => ({
    step: state.tick - loss.length + i + 1,
    loss: parseFloat(val.toFixed(4)),
  }));

  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Policy Loss Curve</h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          L(θ) = {(state.lossHistory[state.lossHistory.length - 1] || 0).toFixed(4)}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
            <XAxis dataKey="step" hide />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{
                background: 'hsl(240 6% 10%)',
                border: '1px solid hsl(240 4% 16%)',
                borderRadius: '6px',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: 'hsl(0 0% 95%)',
              }}
            />
            <Line type="monotone" dataKey="loss" stroke="hsl(38 92% 50%)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
