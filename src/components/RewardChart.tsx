import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import type { SimState } from '@/lib/marl-engine';

interface Props {
  state: SimState;
}

export default function RewardChart({ state }: Props) {
  const throughput = state.throughputHistory.slice(-80);
  const conflicts = state.conflictHistory.slice(-80);
  const data = throughput.map((val, i) => ({
    tick: state.tick - throughput.length + i + 1,
    throughput: val,
    conflicts: conflicts[i] || 0,
  }));

  return (
    <div className="panel p-5 h-full flex flex-col overflow-hidden" style={{ maxHeight: '320px' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">System Performance</h3>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-primary inline-block rounded" /> Throughput</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-destructive inline-block rounded" /> Conflicts</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
            <XAxis dataKey="tick" hide />
            <YAxis hide />
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
            <Line type="monotone" dataKey="throughput" stroke="hsl(221, 83%, 53%)" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="conflicts" stroke="hsl(0, 72%, 51%)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
