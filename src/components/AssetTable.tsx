import type { SimState } from '@/lib/marl-engine';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Props {
  state: SimState;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  moving: { label: 'In Transit', className: 'text-primary' },
  delivering: { label: 'Delivering', className: 'text-success' },
  idle: { label: 'Idle', className: 'text-muted-foreground' },
  waiting: { label: 'Backoff', className: 'text-warning' },
};

export default function AssetTable({ state }: Props) {
  const sorted = [...state.agents].sort((a, b) => b.deliveries - a.deliveries).slice(0, 20);

  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Asset Monitoring</h3>
        <span className="text-xs text-muted-foreground font-mono">{state.agents.length} units</span>
      </div>
      <div className="flex-1 overflow-auto min-h-0 terminal-scroll">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs font-mono text-muted-foreground h-8">ID</TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground h-8">Status</TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground h-8">Position</TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground h-8 text-right">Deliveries</TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground h-8 text-right">Energy</TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground h-8 text-right">Conflicts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(agent => {
              const s = statusLabels[agent.status];
              return (
                <TableRow key={agent.id} className="border-border/30 hover:bg-muted/30">
                  <TableCell className="font-mono text-xs py-2">{String(agent.id).padStart(3, '0')}</TableCell>
                  <TableCell className={`font-mono text-xs py-2 ${s.className}`}>{s.label}</TableCell>
                  <TableCell className="font-mono text-xs py-2 text-muted-foreground">({agent.x}, {agent.y})</TableCell>
                  <TableCell className="font-mono text-xs py-2 text-right">{agent.deliveries}</TableCell>
                  <TableCell className="font-mono text-xs py-2 text-right">{agent.energy.toFixed(0)}%</TableCell>
                  <TableCell className="font-mono text-xs py-2 text-right text-destructive">{agent.collisions}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
