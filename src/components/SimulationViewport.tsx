import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { SimState, Agent } from '@/lib/marl-engine';

const GRID_SIZE = 20;

interface Props {
  state: SimState;
  selectedAgentId: number | null;
  onSelectAgent: (id: number | null) => void;
  heatmapVisible: boolean;
  onToggleHeatmap: () => void;
  onToggleBlock: (x: number, y: number) => void;
}

function AssetMarker({ agent, cellSize, selected, dimmed, onSelect }: { agent: Agent; cellSize: number; selected: boolean; dimmed: boolean; onSelect: () => void }) {
  const statusColor = agent.status === 'moving'
    ? 'hsl(var(--primary))'
    : agent.status === 'delivering'
      ? 'hsl(var(--success))'
      : 'hsl(var(--muted-foreground))';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className="absolute cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          animate={{
            left: `${(agent.x + 0.5) * cellSize - 0.6}%`,
            top: `${(agent.y + 0.5) * cellSize - 0.6}%`,
            opacity: dimmed ? 0.25 : 1,
          }}
          transition={{ duration: 0.15, ease: 'linear' }}
          style={{ width: '1.2%', height: '1.2%' }}
        >
          {selected && (
            <motion.div
              className="absolute -inset-[6px] rounded-full border-2 border-primary"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.2, 1], opacity: 1 }}
              transition={{ scale: { repeat: Infinity, duration: 1.5 } }}
              style={{ boxShadow: '0 0 8px hsl(var(--primary) / 0.3)' }}
            />
          )}
          <svg viewBox="0 0 24 24" className="w-full h-full" fill="none">
            <rect x="3" y="6" width="18" height="12" rx="2" fill={statusColor} opacity={0.9} />
            <circle cx="8" cy="18" r="2" fill={statusColor} />
            <circle cx="16" cy="18" r="2" fill={statusColor} />
          </svg>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-mono text-xs space-y-1 p-3">
        <div className="text-foreground font-semibold">Asset {String(agent.id).padStart(3, '0')}</div>
        <div className="text-muted-foreground">Velocity: {(agent.velocity ?? 0).toFixed(1)} u/t</div>
        <div className="text-muted-foreground">Energy: {(agent.energy ?? 100).toFixed(1)}%</div>
        <div className="text-muted-foreground">Position: ({agent.x}, {agent.y})</div>
        {agent.targetX !== null && (
          <div className="text-primary">Target: ({agent.targetX}, {agent.targetY})</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default function SimulationViewport({ state, selectedAgentId, onSelectAgent, heatmapVisible, onToggleHeatmap, onToggleBlock }: Props) {
  const cellSize = useMemo(() => 100 / GRID_SIZE, []);
  const hasSelection = selectedAgentId !== null;

  const roads = useMemo(() => {
    const h: number[] = [];
    const v: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      if (i % 4 === 0 || i % 4 === 1) { h.push(i); v.push(i); }
    }
    return { h, v };
  }, []);

  return (
    <div className="panel relative w-full aspect-square overflow-hidden" onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const gridX = Math.floor(relX * GRID_SIZE);
      const gridY = Math.floor(relY * GRID_SIZE);
      if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
        onToggleBlock(gridX, gridY);
      }
    }}>
      {/* Header */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="font-mono text-[11px] text-muted-foreground tracking-wide">
          Infrastructure Map — Tick {state.tick}
        </span>
      </div>

      {/* Legend + Heatmap Toggle */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
        <label className="flex items-center gap-1.5 cursor-pointer" onClick={e => e.stopPropagation()}>
          <Switch checked={heatmapVisible} onCheckedChange={onToggleHeatmap} className="scale-75" />
          <span>Heatmap</span>
        </label>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary" /> In Transit</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success" /> Delivering</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted-foreground" /> Idle</span>
      </div>

      {/* Urban map background */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {roads.h.map(i => (
          <rect key={`hr-${i}`} x="0" y={`${i * cellSize}%`} width="100%" height={`${cellSize}%`} fill="hsl(var(--border) / 0.3)" />
        ))}
        {roads.v.map(i => (
          <rect key={`vr-${i}`} x={`${i * cellSize}%`} y="0" width={`${cellSize}%`} height="100%" fill="hsl(var(--border) / 0.3)" />
        ))}
        {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
          <line key={`h-${i}`} x1="0" y1={`${i * cellSize}%`} x2="100%" y2={`${i * cellSize}%`} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
        ))}
        {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
          <line key={`v-${i}`} x1={`${i * cellSize}%`} y1="0" x2={`${i * cellSize}%`} y2="100%" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
        ))}
        {Array.from({ length: GRID_SIZE }, (_, r) =>
          Array.from({ length: GRID_SIZE }, (_, c) => {
            if (!roads.h.includes(r) && !roads.v.includes(c)) {
              return (
                <rect key={`b-${r}-${c}`} x={`${c * cellSize + 0.3}%`} y={`${r * cellSize + 0.3}%`} width={`${cellSize - 0.6}%`} height={`${cellSize - 0.6}%`} rx="1" fill="hsl(var(--muted) / 0.5)" stroke="hsl(var(--border))" strokeWidth="0.3" />
              );
            }
            return null;
          })
        )}
      </svg>

      {/* Decision Heatmap Overlay */}
      {heatmapVisible && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {state.decisionHeatmap.map((row, y) =>
            row.map((val, x) => {
              if (val < 0.5) return null;
              const intensity = Math.min(1, val / 8);
              return (
                <rect
                  key={`hm-${y}-${x}`}
                  x={`${x * cellSize}%`}
                  y={`${y * cellSize}%`}
                  width={`${cellSize}%`}
                  height={`${cellSize}%`}
                  fill={`hsl(38 92% 50% / ${intensity * 0.6})`}
                  rx="1"
                >
                  {intensity > 0.5 && (
                    <animate attributeName="opacity" values={`${intensity * 0.4};${intensity * 0.7};${intensity * 0.4}`} dur="2s" repeatCount="indefinite" />
                  )}
                </rect>
              );
            })
          )}
        </svg>
      )}

      {/* Blocked Intersections (Emergency) */}
      {state.blockedIntersections.map((b, i) => (
        <motion.div
          key={`blocked-${i}`}
          className="absolute pointer-events-none"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{
            left: `${b.x * cellSize}%`,
            top: `${b.y * cellSize}%`,
            width: `${cellSize * 2}%`,
            height: `${cellSize * 2}%`,
          }}
        >
          <div className="w-full h-full rounded-sm border-2 border-destructive bg-destructive/20 flex items-center justify-center">
            <span className="text-destructive text-[8px] font-mono font-bold">BLOCKED</span>
          </div>
        </motion.div>
      ))}

      {/* Manual Blocks */}
      {state.manualBlocks.map((b, i) => (
        <div
          key={`manual-${i}`}
          className="absolute z-[5]"
          style={{
            left: `${b.x * cellSize}%`,
            top: `${b.y * cellSize}%`,
            width: `${cellSize}%`,
            height: `${cellSize}%`,
          }}
        >
          <div className="w-full h-full rounded-sm bg-destructive/40 border border-destructive flex items-center justify-center">
            <span className="text-destructive text-[7px] font-mono font-bold">✕</span>
          </div>
        </div>
      ))}

      {/* Trajectories */}
      {state.agents
        .filter(a => a.path.length > 0)
        .slice(0, 15)
        .map(agent => {
          const isSelected = agent.id === selectedAgentId;
          const allPts = [{ x: agent.x, y: agent.y }, ...agent.path];
          return allPts.slice(0, -1).map((pt, i) => {
            const next = allPts[i + 1];
            const x1 = (pt.x + 0.5) * cellSize;
            const y1 = (pt.y + 0.5) * cellSize;
            const x2 = (next.x + 0.5) * cellSize;
            const y2 = (next.y + 0.5) * cellSize;
            return (
              <motion.div
                key={`path-${agent.id}-${i}`}
                className="absolute"
                animate={{
                  opacity: isSelected ? [0.4, 0.7, 0.4] : hasSelection ? 0.05 : 0.2,
                }}
                transition={isSelected ? { repeat: Infinity, duration: 1.2 } : { duration: 0.3 }}
                style={{
                  left: `${Math.min(x1, x2)}%`,
                  top: `${Math.min(y1, y2)}%`,
                  width: x1 === x2 ? '2px' : `${Math.abs(x2 - x1)}%`,
                  height: y1 === y2 ? '2px' : `${Math.abs(y2 - y1)}%`,
                  backgroundColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
                }}
              />
            );
          });
        })}

      {/* Delivery Points */}
      {state.deliveryPoints.map(dp => (
        <motion.div
          key={dp.id}
          className="absolute"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: hasSelection ? 0.3 : 1 }}
          style={{
            left: `${(dp.x + 0.5) * cellSize - 0.7}%`,
            top: `${(dp.y + 0.5) * cellSize - 0.7}%`,
            width: '1.4%',
            height: '1.4%',
          }}
        >
          <div className={`w-full h-full rounded-full border-2 ${dp.claimed ? 'border-muted-foreground bg-muted-foreground/20' : 'border-primary bg-primary/20'}`} />
        </motion.div>
      ))}

      {/* Asset Markers */}
      {state.agents.map(agent => (
        <AssetMarker
          key={agent.id}
          agent={agent}
          cellSize={cellSize}
          selected={agent.id === selectedAgentId}
          dimmed={hasSelection && agent.id !== selectedAgentId}
          onSelect={() => onSelectAgent(agent.id === selectedAgentId ? null : agent.id)}
        />
      ))}
    </div>
  );
}
