import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SimState } from '@/lib/marl-engine';

const GRID_SIZE = 20;

interface Props {
  state: SimState;
}

export default function SimulationViewport({ state }: Props) {
  const cellSize = useMemo(() => {
    // We'll render in a square viewport; cell size computed in CSS via percentage
    return 100 / GRID_SIZE;
  }, []);

  return (
    <div className="glass-card-glow relative w-full aspect-square overflow-hidden">
      {/* Grid title */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-glow" />
        <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
          City District • Tick {state.tick}
        </span>
      </div>

      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={`${i * cellSize}%`}
            x2="100%"
            y2={`${i * cellSize}%`}
            stroke="hsl(var(--grid-line))"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
          <line
            key={`v-${i}`}
            x1={`${i * cellSize}%`}
            y1="0"
            x2={`${i * cellSize}%`}
            y2="100%"
            stroke="hsl(var(--grid-line))"
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* Decision paths */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {state.agents
          .filter(a => a.path.length > 0)
          .slice(0, 15) // Limit rendered paths for performance
          .map(agent => {
            const points = [
              { x: agent.x, y: agent.y },
              ...agent.path,
            ];
            const d = points
              .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x + 0.5) * cellSize}%,${(p.y + 0.5) * cellSize}%`)
              .join(' ');
            // Can't use % in SVG path d attribute, use viewBox trick
            return null;
          })}
        {/* Use positioned divs for paths instead */}
      </svg>

      {/* Paths as positioned lines */}
      {state.agents
        .filter(a => a.path.length > 0)
        .slice(0, 12)
        .map(agent => {
          const allPts = [{ x: agent.x, y: agent.y }, ...agent.path];
          return allPts.slice(0, -1).map((pt, i) => {
            const next = allPts[i + 1];
            const x1 = (pt.x + 0.5) * cellSize;
            const y1 = (pt.y + 0.5) * cellSize;
            const x2 = (next.x + 0.5) * cellSize;
            const y2 = (next.y + 0.5) * cellSize;
            return (
              <div
                key={`path-${agent.id}-${i}`}
                className="absolute bg-neon-cyan/10"
                style={{
                  left: `${Math.min(x1, x2)}%`,
                  top: `${Math.min(y1, y2)}%`,
                  width: x1 === x2 ? '1px' : `${Math.abs(x2 - x1)}%`,
                  height: y1 === y2 ? '1px' : `${Math.abs(y2 - y1)}%`,
                }}
              />
            );
          });
        })}

      {/* Delivery Points */}
      {state.deliveryPoints.map(dp => (
        <motion.div
          key={dp.id}
          className="absolute rounded-full"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            left: `${(dp.x + 0.5) * cellSize - 0.8}%`,
            top: `${(dp.y + 0.5) * cellSize - 0.8}%`,
            width: '1.6%',
            height: '1.6%',
            background: dp.claimed
              ? 'hsl(var(--neon-purple))'
              : 'hsl(var(--neon-cyan))',
            boxShadow: dp.claimed
              ? '0 0 12px hsl(var(--neon-purple) / 0.6)'
              : '0 0 12px hsl(var(--neon-cyan) / 0.6)',
          }}
        />
      ))}

      {/* Agents */}
      {state.agents.map(agent => (
        <motion.div
          key={agent.id}
          className="absolute"
          animate={{
            left: `${(agent.x + 0.5) * cellSize - 0.5}%`,
            top: `${(agent.y + 0.5) * cellSize - 0.5}%`,
          }}
          transition={{ duration: 0.15, ease: 'linear' }}
          style={{
            width: '1%',
            height: '1%',
          }}
        >
          <div
            className="w-full h-full rounded-sm"
            style={{
              background: agent.status === 'moving'
                ? 'hsl(var(--neon-cyan))'
                : agent.status === 'delivering'
                  ? 'hsl(var(--neon-purple))'
                  : 'hsl(var(--muted-foreground))',
              boxShadow: agent.status === 'moving'
                ? '0 0 6px hsl(var(--neon-cyan) / 0.8)'
                : 'none',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
