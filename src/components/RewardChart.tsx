import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { SimState } from '@/lib/marl-engine';

interface Props {
  state: SimState;
}

export default function RewardChart({ state }: Props) {
  const data = state.rewardHistory.slice(-100).map((val, i) => ({
    tick: state.tick - state.rewardHistory.slice(-100).length + i + 1,
    reward: Math.round(val * 100) / 100,
  }));

  return (
    <div className="glass-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
          Cumulative Reward
        </h3>
        <span className="font-mono text-sm neon-text-cyan">
          {Math.round(state.totalReward)}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="tick" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: 'hsl(0 0% 5% / 0.9)',
                border: '1px solid hsl(0 0% 15%)',
                borderRadius: '8px',
                fontFamily: 'Space Mono',
                fontSize: '11px',
                color: 'hsl(183 100% 50%)',
              }}
            />
            <Line
              type="monotone"
              dataKey="reward"
              stroke="hsl(183, 100%, 50%)"
              strokeWidth={2}
              dot={false}
              strokeShadow="0 0 8px hsl(183, 100%, 50%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
