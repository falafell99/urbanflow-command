import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SimulationViewport from '@/components/SimulationViewport';
import RewardChart from '@/components/RewardChart';
import EfficiencyGauge from '@/components/EfficiencyGauge';
import AgentLogs from '@/components/AgentLogs';
import HyperparamPanel from '@/components/HyperparamPanel';
import TechArchitecture from '@/components/TechArchitecture';
import StatsBar from '@/components/StatsBar';
import AssetTable from '@/components/AssetTable';
import ActiveInspector from '@/components/ActiveInspector';
import LoadingOverlay from '@/components/LoadingOverlay';
import ProjectFooter from '@/components/ProjectFooter';
import { createInitialState, stepSimulation, type Hyperparams, type SimState } from '@/lib/marl-engine';

export default function Index() {
  const [state, setState] = useState<SimState>(createInitialState);
  const [running, setRunning] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [congestionMode, setCongestionMode] = useState(false);
  const [params, setParams] = useState<Hyperparams>({
    learningRate: 0.003,
    discountFactor: 0.99,
    explorationRate: 0.15,
  });
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const congestionRef = useRef(congestionMode);
  congestionRef.current = congestionMode;

  const step = useCallback(() => {
    setState(prev => {
      const next = stepSimulation(prev, paramsRef.current);
      // Inject congestion spikes
      if (congestionRef.current) {
        const lastIdx = next.conflictHistory.length - 1;
        next.conflictHistory[lastIdx] = (next.conflictHistory[lastIdx] || 0) + Math.floor(Math.random() * 5 + 3);
        next.throughputHistory[lastIdx] = Math.max(0, (next.throughputHistory[lastIdx] || 0) - Math.floor(Math.random() * 2));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(step, 200);
    return () => clearInterval(id);
  }, [running, step]);

  const reset = () => {
    setRunning(false);
    setSelectedAgentId(null);
    setCongestionMode(false);
    setState(createInitialState());
  };

  const selectedAgent = selectedAgentId !== null
    ? state.agents.find(a => a.id === selectedAgentId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LoadingOverlay />

      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            UrbanFlow AI
          </h1>
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
            Fleet Coordination System v2.4
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-muted-foreground hover:text-foreground h-8 text-xs gap-1.5"
            onClick={() => window.open('https://github.com', '_blank')}
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Implementation</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => setRunning(!running)}
            className={running
              ? 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 h-8'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 h-8'
            }
          >
            {running ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
            <span className="hidden sm:inline">{running ? 'Pause' : 'Start Simulation'}</span>
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-4 flex-1">
        {/* Stats Bar */}
        <StatsBar state={state} running={running} congestionMode={congestionMode} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Simulation Viewport */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7"
          >
            <SimulationViewport
              state={state}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
            />
          </motion.div>

          {/* Right Panel */}
          <div className="lg:col-span-5 grid grid-rows-[auto_1fr_1fr] gap-4 lg:max-h-[720px] min-h-0 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="min-h-0 max-h-[260px] overflow-auto">
              <ActiveInspector
                agent={selectedAgent}
                tick={state.tick}
                onClose={() => setSelectedAgentId(null)}
              />
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="min-h-0">
              <RewardChart state={state} />
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="min-h-0 overflow-hidden">
              <AgentLogs logs={state.logs} />
            </motion.div>
          </div>

          {/* Bottom Row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="lg:col-span-3">
            <EfficiencyGauge state={state} />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="lg:col-span-3">
            <HyperparamPanel
              params={params}
              onChange={setParams}
              congestionMode={congestionMode}
              onCongestionToggle={setCongestionMode}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="lg:col-span-6">
            <AssetTable state={state} />
          </motion.div>

          {/* Architecture */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="lg:col-span-12">
            <TechArchitecture />
          </motion.div>
        </div>
      </div>

      <ProjectFooter />
    </div>
  );
}
